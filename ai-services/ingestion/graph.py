"""LangGraph workflow: select targets -> search -> extract -> validate -> persist.

Every external dependency (Tavily, Ollama, MongoDB) is injected so the whole
graph can be exercised offline with fakes. Quota exhaustion sets `halt`, which
makes the remaining nodes skip external calls while still validating and saving
whatever was gathered, so partial progress is never lost.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .clients import OllamaClient, ProviderError, QuotaExhausted, TavilyClient
from .config import Settings
from .extract import SYSTEM_PROMPT, condense, user_prompt
from .store import Store, identity_key, now, slug
from .targets import TARGETS
from .validate import Issue, SourceDoc, build_claims, merge_claims, page_matches_target

logger = logging.getLogger("speedhype.ingestion.graph")


class State(TypedDict, total=False):
    targets: list[dict[str, Any]]
    docs: dict[int, list[SourceDoc]]          # target index -> retained source docs
    extractions: dict[int, list[tuple[SourceDoc, dict[str, Any]]]]
    notes: dict[int, list[Issue]]
    halt: str | None
    outcomes: list[dict[str, Any]]


class Pipeline:
    def __init__(self, settings: Settings, store: Store, tavily: TavilyClient, llm: OllamaClient,
                 run_id: str, count: int, llm_interval: float = 0.0,
                 targets: list[dict[str, Any]] | None = None, retry_of: str | None = None):
        self.s, self.store, self.tavily, self.llm = settings, store, tavily, llm
        self.run_id, self.count = run_id, count
        self.interval = llm_interval  # local model: no provider rate limit to respect
        self.fixed_targets, self.retry_of = targets, retry_of
        self.graph = self._build()

    # ---- graph ----------------------------------------------------------
    def _build(self):
        g = StateGraph(State)
        g.add_node("select_targets", self.select_targets)
        g.add_node("search_sources", self.search_sources)
        g.add_node("extract_data", self.extract_data)
        g.add_node("validate_and_persist", self.validate_and_persist)
        g.add_edge(START, "select_targets")
        g.add_edge("select_targets", "search_sources")
        g.add_edge("search_sources", "extract_data")
        g.add_edge("extract_data", "validate_and_persist")
        g.add_edge("validate_and_persist", END)
        return g.compile()

    async def run(self) -> State:
        return await self.graph.ainvoke({"halt": None, "docs": {}, "extractions": {}, "notes": {}, "outcomes": []})

    def log(self, level: str, message: str):
        logger.log(logging.ERROR if level == "error" else logging.INFO, message)
        return self.store.log(self.run_id, level, message)

    # ---- nodes ----------------------------------------------------------
    async def select_targets(self, state: State) -> State:
        if self.fixed_targets is not None:  # explicit retry of a specific car: never skipped as 'existing'
            await self.log("info", f"Retrying {len(self.fixed_targets)} specific target(s).")
            return {"targets": self.fixed_targets}
        existing = await self.store.existing_targets(TARGETS)
        fresh = [t for t in TARGETS if (slug(t["brand"]), slug(t["model"]), int(t["year"])) not in existing]
        chosen = fresh[: self.count]
        skipped = len(TARGETS) - len(fresh)
        await self.log("info", f"Selected {len(chosen)} new target(s) ({skipped} already in the database were skipped).")
        if len(chosen) < self.count:
            await self.log("warn", f"Only {len(chosen)} of {self.count} requested cars are left in the curated target list.")
        return {"targets": chosen}

    async def search_sources(self, state: State) -> State:
        docs: dict[int, list[SourceDoc]] = {}
        notes: dict[int, list[Issue]] = {}
        halt = state.get("halt")
        for index, target in enumerate(state["targets"]):
            if halt:
                break
            brand = target["brand"]
            official = self.s.official_domains_for(brand)
            query = f"{target['year']} {brand} {target['model']} India ex-showroom price specifications power torque mileage"
            try:
                found: list[SourceDoc] = []
                results = await self.tavily.search(query, official + list(self.s.secondary_domains))
                found += self._to_docs(target, results)
                if official and not any(d.tier == "primary" for d in found):
                    await self.log("info", f"{brand} {target['model']}: no official page in first search; searching official domains only.")
                    results = await self.tavily.search(f"{brand} {target['model']} specifications price India", official)
                    found += self._to_docs(target, results)
                kept = self._select(found)
                docs[index] = kept
                await self.log("info", f"{brand} {target['model']}: kept {len(kept)} source(s): " + ", ".join(f"{d.domain} [{d.tier}]" for d in kept))
            except QuotaExhausted as exc:
                halt = str(exc)
                await self.log("error", f"Stopped during search: {exc}")
            except ProviderError as exc:
                notes.setdefault(index, []).append(Issue("error", "search_failed", str(exc)))
                await self.log("error", f"{brand} {target['model']}: search failed - {exc}")
        return {"docs": docs, "notes": notes, "halt": halt}

    def _to_docs(self, target: dict[str, Any], payload: dict[str, Any]) -> list[SourceDoc]:
        brand = target["brand"]
        images = []
        for image in payload.get("images") or []:
            url = image.get("url") if isinstance(image, dict) else image
            if isinstance(url, str) and url.startswith("https://") and self.s.source_tier(brand, url) == "primary":
                alt = (image.get("description") if isinstance(image, dict) else None) or f"{brand} {target['model']}"
                images.append({"url": url, "alt": str(alt)[:200]})
        docs = []
        for result in payload.get("results") or []:
            url = result.get("url") or ""
            tier = self.s.source_tier(brand, url) if url.startswith("https://") else None
            if not tier:
                continue  # never trust results outside the curated domain lists
            text = condense(result.get("raw_content") or result.get("content") or "")
            doc = SourceDoc(url=url, title=(result.get("title") or "")[:300], domain=url.split("/")[2].lower(),
                            tier=tier, text=text, images=images if tier == "primary" else [])
            if len(text) >= 200 and page_matches_target(doc, brand, target["model"]):
                docs.append(doc)
        return docs

    def _select(self, found: list[SourceDoc]) -> list[SourceDoc]:
        """Prefer official pages, then at most one page per domain, up to the per-car cap."""
        ordered = sorted(found, key=lambda d: 0 if d.tier == "primary" else 1)
        kept, seen = [], set()
        for doc in ordered:
            if doc.domain in seen:
                continue
            seen.add(doc.domain)
            kept.append(doc)
        return kept[: self.s.max_sources_per_car]

    async def extract_data(self, state: State) -> State:
        extractions: dict[int, list[tuple[SourceDoc, dict[str, Any]]]] = {}
        notes = state.get("notes", {})
        halt = state.get("halt")
        for index, doc_list in state.get("docs", {}).items():
            target = state["targets"][index]
            for doc in doc_list:
                if halt:
                    break
                try:
                    data = await self.llm.extract_json(SYSTEM_PROMPT, user_prompt(target, doc.title, doc.url, doc.text))
                    extractions.setdefault(index, []).append((doc, data))
                    await asyncio.sleep(self.interval)
                except QuotaExhausted as exc:
                    halt = str(exc)
                    await self.log("error", f"Stopped during extraction: {exc}")
                except ProviderError as exc:
                    notes.setdefault(index, []).append(Issue("warn", "extraction_failed", f"{doc.domain}: {exc}"))
                    await self.log("error", f"{target['brand']} {target['model']} / {doc.domain}: extraction failed - {exc}")
        return {"extractions": extractions, "notes": notes, "halt": halt}

    async def validate_and_persist(self, state: State) -> State:
        outcomes = []
        for index, target in enumerate(state.get("targets", [])):
            label = f"{target['brand']} {target['model']} {target['year']}"
            issues = list(state.get("notes", {}).get(index, []))
            pairs = state.get("extractions", {}).get(index, [])
            if not pairs:
                reason = state.get("halt") or "no usable source text or extraction was available"
                issues.append(Issue("error", "no_data", f"Nothing was stored: {reason}."))
                outcome = {"target": target, "status": "failed", "sources": [], "issues": [i.asdict() for i in issues]}
                await self.store.add_result(self.run_id, outcome, "failed")
                await self.log("error", f"{label}: not stored - {reason}.")
                outcomes.append(outcome)
                continue
            docs = [d for d, _ in pairs]
            claims = [build_claims(data, doc, issues) for doc, data in pairs]
            record = merge_claims(target, docs, claims, issues)
            anchor: SourceDoc = record.pop("_anchor")
            validation = record.pop("_validation")
            sources = [{"url": d.url, "title": d.title, "domain": d.domain, "tier": d.tier, "retrievedAt": now()} for d in docs]
            images = [{
                "url": im["url"], "alt": im["alt"], "sourceUrl": anchor.url,
                "license": f"Not verified - owned by {target['brand']}; linked from its official site, not copied",
                "attribution": f"Image: {target['brand']} (official website, {anchor.domain})",
                "permissionStatus": "unverified",
            } for d in docs if d.tier == "primary" for im in d.images][:3]
            record.update({
                "identityKey": identity_key(target["brand"], target["model"], record["variant"], record["launchYear"]),
                "images": images,
                "sourceUrl": anchor.url, "sourceTitle": anchor.title, "sourceName": anchor.domain,
                "sourceLicense": "Facts extracted from the cited page; no content licence is claimed. Quotes are short excerpts for attribution.",
                "sourceLicenseUrl": "",
                "sourceVerifiedAt": now(),  # date the sources were last checked, not a guarantee of correctness
                "sources": sources,
                "validation": validation,
                "ingestionRunId": self.run_id,
                "ingestedBy": "speedhype-agent",
            })
            try:
                result, car_id = await self.store.upsert_pending_car(record)
            except Exception as exc:  # database problems must not abort the whole batch
                await self.log("error", f"{label}: database write failed - {exc}")
                outcome = {"target": target, "status": "failed", "sources": sources, "issues": [Issue("error", "db_error", str(exc)).asdict()]}
                await self.store.add_result(self.run_id, outcome, "failed")
                outcomes.append(outcome)
                continue
            if result == "exists_reviewed":
                outcome = {"target": target, "status": "skipped_existing", "identityKey": record["identityKey"], "sources": sources, "issues": validation["issues"]}
                await self.store.add_result(self.run_id, outcome, "skippedExisting")
                await self.log("warn", f"{label}: already reviewed in the database; left unchanged.")
            else:
                outcome = {
                    "target": target, "status": "pending_review", "carId": car_id, "identityKey": record["identityKey"],
                    "recommendation": validation["recommendation"], "fieldStatus": validation["fieldStatus"],
                    "sources": sources, "issues": validation["issues"], "conflicts": validation["conflicts"],
                }
                await self.store.add_result(
                    self.run_id, outcome, "pendingReview",
                    extra="needsAttention" if validation["recommendation"] == "needs_attention" else None,
                )
                if self.retry_of and car_id and car_id != self.retry_of:
                    await self.store.supersede(self.retry_of, car_id)
                await self.log("info", f"{label}: {result} as pending review ({validation['recommendation']}, {len(validation['issues'])} issue(s)).")
            outcomes.append(outcome)
        return {"outcomes": outcomes}
