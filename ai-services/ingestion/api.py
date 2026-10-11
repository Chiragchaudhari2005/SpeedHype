"""Secured internal HTTP API for the ingestion service.

Only the Express server (which has already authenticated the Clerk user and
checked admin authorization) may call these routes, using a shared secret. The
`requestedBy` value is supplied by Express from the verified Clerk session and
is stored for audit only - the service never authorises on it.
"""
from __future__ import annotations

import asyncio
import hmac
import logging
from dataclasses import replace
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .clients import OllamaClient, QuotaExhausted, TavilyClient, inspect_ollama
from .config import Settings, load_settings, missing_config
from .graph import Pipeline
from .store import Store, now

logger = logging.getLogger("speedhype.ingestion.api")
router = APIRouter(prefix="/ingest", tags=["ingestion"])

_lock = asyncio.Lock()
_active: dict[str, Any] = {"runId": None}
_store: Store | None = None
_tasks: set[asyncio.Task] = set()


class IngestRequest(BaseModel):
    count: int = Field(ge=1, le=100)
    requestedBy: str = Field(min_length=1, max_length=200)


class RetryRequest(BaseModel):
    carId: str = Field(pattern=r"^[0-9a-fA-F]{24}$")
    requestedBy: str = Field(min_length=1, max_length=200)


def _check_secret(authorization: str | None, settings: Settings) -> None:
    if not settings.shared_secret:
        raise HTTPException(503, "Agent control authentication is not configured.")
    supplied = (authorization or "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(settings.shared_secret, supplied):
        raise HTTPException(401, "Valid agent control credentials are required.")


def get_store(settings: Settings) -> Store:
    global _store
    if _store is None:
        _store = Store(settings)
    return _store


async def execute_run(settings: Settings, store: Store, run_id: str, count: int,
                      transport: httpx.AsyncBaseTransport | None = None,
                      targets: list[dict[str, Any]] | None = None, retry_of: str | None = None) -> str:
    """Run the pipeline to completion and finalise the run document. Returns the final status."""

    async def before_call(provider: str) -> None:
        # Only Tavily has quotas; the local Ollama model is unlimited and only counted for information.
        if provider == "tavily":
            totals = await store.usage_totals()
            if totals["tavilyToday"] >= settings.max_tavily_searches_per_day:
                raise QuotaExhausted(f"Local daily Tavily limit reached ({settings.max_tavily_searches_per_day} searches).")
            if totals["tavilyMonth"] >= settings.max_tavily_searches_per_month:
                raise QuotaExhausted(f"Local monthly Tavily limit reached ({settings.max_tavily_searches_per_month} searches).")
        await store.record_usage(provider)
        await store.inc_run_usage(run_id, provider)

    status = "failed"
    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout, transport=transport) as client:
            pipeline = Pipeline(settings, store, TavilyClient(settings, client, before_call),
                                OllamaClient(settings, client, before_call), run_id, count,
                                targets=targets, retry_of=retry_of)
            state = await pipeline.run()
        failed = sum(1 for o in state.get("outcomes", []) if o["status"] == "failed")
        if state.get("halt"):
            status = "quota_exhausted"
            await store.log(run_id, "error", f"Run halted: {state['halt']}")
        else:
            status = "completed_with_errors" if failed else "completed"
    except Exception as exc:  # noqa: BLE001 - last-resort guard so the run never stays 'running'
        logger.exception("Ingestion run %s crashed", run_id)
        await store.log(run_id, "error", f"Run crashed: {exc}")
    await store.update_run(run_id, status=status, finishedAt=now())
    return status


@router.get("/status")
async def status(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    settings = load_settings()
    _check_secret(authorization, settings)
    missing = missing_config(settings)
    ollama = await inspect_ollama(settings)
    payload: dict[str, Any] = {
        "configured": not missing and ollama["reachable"] and bool(ollama["model"]),
        "missingConfig": missing,
        "ollama": {"reachable": ollama["reachable"], "baseUrl": settings.ollama_base_url, "model": ollama["model"],
                   "installedModels": ollama["models"], "error": ollama["error"]},
        "activeRunId": _active["runId"], "running": _lock.locked(),
        "limits": {
            "maxCarsPerRun": settings.max_cars_per_run,
            "tavilyPerDay": settings.max_tavily_searches_per_day,
            "tavilyPerMonth": settings.max_tavily_searches_per_month,
        },
    }
    if not missing:
        try:
            payload["usage"] = await get_store(settings).usage_totals()
        except Exception:  # noqa: BLE001
            payload["usage"] = None
    return payload


async def _launch(settings: Settings, count: int, requested_by: str,
                  targets: list[dict[str, Any]] | None = None, retry_of: str | None = None) -> dict[str, Any]:
    """Shared preflight + background start for both new runs and single-car retries."""
    missing = missing_config(settings)
    if missing:
        raise HTTPException(503, f"Ingestion is not configured. Missing: {', '.join(missing)}.")
    ollama = await inspect_ollama(settings)
    if not ollama["model"]:
        raise HTTPException(503, ollama["error"] or "No Ollama model is available.")
    if _lock.locked():
        raise HTTPException(409, "An ingestion run is already active.")
    store = get_store(settings)
    totals = await store.usage_totals()
    if totals["tavilyToday"] >= settings.max_tavily_searches_per_day or totals["tavilyMonth"] >= settings.max_tavily_searches_per_month:
        raise HTTPException(429, "The configured Tavily search limit for today/this month is exhausted.")
    await _lock.acquire()
    try:
        await store.ensure_indexes()
        run_id = await store.create_run(count, requested_by)
    except Exception as exc:  # noqa: BLE001
        _lock.release()
        raise HTTPException(502, f"Could not reach MongoDB: {type(exc).__name__}") from exc
    _active["runId"] = run_id
    settings = replace(settings, ollama_model=ollama["model"])

    async def background() -> None:
        try:
            await execute_run(settings, store, run_id, count, targets=targets, retry_of=retry_of)
        finally:
            _active["runId"] = None
            _lock.release()

    task = asyncio.create_task(background())
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return {"runId": run_id, "status": "running", "model": ollama["model"]}


@router.post("", status_code=202)
async def start(body: IngestRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    settings = load_settings()
    _check_secret(authorization, settings)
    if body.count > settings.max_cars_per_run:
        raise HTTPException(422, f"At most {settings.max_cars_per_run} cars can be ingested per run.")
    result = await _launch(settings, body.count, body.requestedBy)
    return {**result, "message": f"Ingestion started for {body.count} car(s) using local model {result['model']}."}


@router.post("/retry", status_code=202)
async def retry(body: RetryRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Re-search and re-extract one existing pending record (the original is replaced, not duplicated)."""
    settings = load_settings()
    _check_secret(authorization, settings)
    if not missing_config(settings):
        car = await get_store(settings).get_car(body.carId)
        if not car:
            raise HTTPException(404, "Car not found.")
        if car.get("reviewStatus") != "pending":
            raise HTTPException(409, "Only pending records can be retried.")
        target = {"brand": car["brand"], "model": car["model"], "year": int(car["launchYear"])}
        result = await _launch(settings, 1, body.requestedBy, targets=[target], retry_of=body.carId)
        return {**result, "message": f"Retrying {target['brand']} {target['model']} {target['year']} with {result['model']}."}
    raise HTTPException(503, f"Ingestion is not configured. Missing: {', '.join(missing_config(settings))}.")
