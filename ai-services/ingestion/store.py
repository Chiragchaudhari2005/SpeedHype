"""MongoDB persistence for the ingestion pipeline (pymongo, run via threads).

The service writes to the *same* `cars` collection that the Express/Mongoose
`Car` model uses, so the identityKey format MUST stay identical to
`normalizeIdentity` in server/src/controllers/carCatalogController.js.
"""
from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

from .config import Settings


def now() -> datetime:
    return datetime.now(timezone.utc)


def slug(part: Any) -> str:
    return re.sub(r"\s+", "-", str(part).strip().lower())


def identity_key(brand: str, model: str, variant: str, year: int) -> str:
    return "|".join(slug(p) for p in (brand, model, variant or "", year))


class Store:
    def __init__(self, settings: Settings, client: MongoClient | None = None):
        self.settings = settings
        self.client = client or MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=8000, appname="speedhype-agent")
        default = urlparse(settings.mongo_uri).path.lstrip("/") or "test"
        self.db = self.client[settings.mongo_db or default]
        self.cars = self.db["cars"]
        self.runs = self.db["ingestionruns"]
        self.usage = self.db["ingestionusage"]

    # ---- helpers -------------------------------------------------------
    @staticmethod
    async def _run(fn, *args, **kwargs):
        return await asyncio.to_thread(fn, *args, **kwargs)

    async def ping(self) -> None:
        await self._run(self.client.admin.command, "ping")

    async def ensure_indexes(self) -> None:
        await self._run(self.cars.create_index, "identityKey", unique=True)

    # ---- runs ----------------------------------------------------------
    async def create_run(self, count: int, requested_by: str) -> str:
        doc = {
            "status": "running", "requestedCount": count, "requestedBy": requested_by,
            "startedAt": now(), "finishedAt": None,
            "usage": {"tavilySearches": 0, "llmCalls": 0},
            "counts": {"processed": 0, "pendingReview": 0, "needsAttention": 0, "skippedExisting": 0, "failed": 0},
            "results": [], "logs": [], "errors": [],
        }
        return str((await self._run(self.runs.insert_one, doc)).inserted_id)

    async def log(self, run_id: str, level: str, message: str) -> None:
        entry = {"ts": now(), "level": level, "message": message[:600]}
        update: dict[str, Any] = {"$push": {"logs": {"$each": [entry], "$slice": -500}}}
        if level == "error":
            update["$push"]["errors"] = {"$each": [message[:600]], "$slice": -100}
        await self._run(self.runs.update_one, {"_id": ObjectId(run_id)}, update)

    async def update_run(self, run_id: str, **fields: Any) -> None:
        await self._run(self.runs.update_one, {"_id": ObjectId(run_id)}, {"$set": fields})

    async def add_result(self, run_id: str, result: dict[str, Any], count_key: str, extra: str | None = None) -> None:
        increments = {f"counts.{count_key}": 1, "counts.processed": 1}
        if extra:
            increments[f"counts.{extra}"] = 1
        await self._run(self.runs.update_one, {"_id": ObjectId(run_id)}, {"$push": {"results": result}, "$inc": increments})

    async def inc_run_usage(self, run_id: str, provider: str) -> None:
        key = "usage.tavilySearches" if provider == "tavily" else "usage.llmCalls"
        await self._run(self.runs.update_one, {"_id": ObjectId(run_id)}, {"$inc": {key: 1}})

    async def mark_stale_runs(self) -> None:
        """Runs left 'running' by a crashed process can never finish; close them."""
        await self._run(self.runs.update_many, {"status": "running"}, {
            "$set": {"status": "failed", "finishedAt": now()},
            "$push": {"errors": "Interrupted: the agent process restarted while this run was active."},
        })

    # ---- quota ---------------------------------------------------------
    async def usage_totals(self) -> dict[str, int]:
        today, month = now().strftime("%Y-%m-%d"), now().strftime("%Y-%m")
        docs = {d["_id"]: d for d in await self._run(lambda: list(self.usage.find({"_id": {"$in": [today, month]}})))}
        return {
            "llmToday": docs.get(today, {}).get("llm", 0),
            "tavilyToday": docs.get(today, {}).get("tavily", 0),
            "tavilyMonth": docs.get(month, {}).get("tavily", 0),
        }

    async def record_usage(self, provider: str) -> None:
        for bucket in (now().strftime("%Y-%m-%d"), now().strftime("%Y-%m")):
            await self._run(self.usage.update_one, {"_id": bucket}, {"$inc": {provider: 1}}, upsert=True)

    # ---- cars ----------------------------------------------------------
    async def existing_targets(self, targets: list[dict[str, Any]]) -> set[tuple[str, str, int]]:
        """Targets already stored under any variant/review status (so they are never re-ingested)."""
        found: set[tuple[str, str, int]] = set()
        for t in targets:
            pattern = rf"^{re.escape(slug(t['brand']))}\|{re.escape(slug(t['model']))}\|.*\|{int(t['year'])}$"
            if await self._run(self.cars.find_one, {"identityKey": {"$regex": pattern}}, {"_id": 1}):
                found.add((slug(t["brand"]), slug(t["model"]), int(t["year"])))
        return found

    async def upsert_pending_car(self, record: dict[str, Any]) -> tuple[str, str | None]:
        """Idempotent upsert keyed by identityKey. Only records that are still
        'pending' are ever overwritten; approved/rejected records are untouched.
        Returns (outcome, car_id) with outcome in {inserted, updated, exists_reviewed}."""
        key = record["identityKey"]
        stamp = now()
        doc = {**record, "ingestionUpdatedAt": stamp, "updatedAt": stamp}
        try:
            result = await self._run(
                self.cars.update_one,
                {"identityKey": key, "reviewStatus": "pending"},
                {"$set": doc, "$setOnInsert": {"createdAt": stamp, "__v": 0}},  # reviewStatus comes from the filter on insert
                upsert=True,
            )
        except DuplicateKeyError:
            return "exists_reviewed", None
        if result.upserted_id:
            return "inserted", str(result.upserted_id)
        existing = await self._run(self.cars.find_one, {"identityKey": key}, {"_id": 1})
        return "updated", str(existing["_id"]) if existing else None

    async def supersede(self, old_id: str, new_id: str) -> None:
        """A retry produced a differently-keyed record; retire the stale pending original."""
        await self._run(
            self.cars.update_one, {"_id": ObjectId(old_id), "reviewStatus": "pending"},
            {"$set": {"reviewStatus": "rejected", "reviewedBy": "speedhype-agent", "reviewedAt": now(),
                      "reviewNotes": f"Superseded by retry record {new_id}."}},
        )

    async def get_car(self, car_id: str) -> dict[str, Any] | None:
        return await self._run(self.cars.find_one, {"_id": ObjectId(car_id)})
