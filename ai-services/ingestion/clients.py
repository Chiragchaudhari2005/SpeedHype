"""Thin Tavily (web search) and Ollama (local LLM) REST clients with timeouts,
retries, and explicit quota-exhaustion handling. No SDKs are required."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable

import httpx

from .config import Settings

logger = logging.getLogger("speedhype.ingestion.clients")


class QuotaExhausted(Exception):
    """A free-tier or locally configured limit was reached; the run stops cleanly."""


class ProviderError(Exception):
    """A provider call failed after retries (non-quota)."""


UsageHook = Callable[[str], Awaitable[None]]  # called with "tavily" / "llm" before a request


async def _post_json(
    client: httpx.AsyncClient,
    url: str,
    *,
    headers: dict[str, str],
    payload: dict[str, Any],
    retries: int,
    provider: str,
    quota_statuses: set[int],
    timeout: float | None = None,
) -> dict[str, Any]:
    last_error = "unknown error"
    extra = {} if timeout is None else {"timeout": timeout}
    for attempt in range(1, retries + 1):
        try:
            response = await client.post(url, headers=headers, json=payload, **extra)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last_error = f"{type(exc).__name__}: {exc}"
        else:
            if response.status_code in quota_statuses:
                if response.status_code == 429 and attempt < retries:
                    wait = min(float(response.headers.get("retry-after", 2 ** attempt)), 20)
                    logger.warning("%s rate limited; retrying in %.1fs", provider, wait)
                    await asyncio.sleep(wait)
                    continue
                raise QuotaExhausted(
                    f"{provider} quota or rate limit reached (HTTP {response.status_code}). "
                    "Wait for the quota to reset or upgrade the plan; partial results were kept."
                )
            if response.status_code in (401, 403):
                raise ProviderError(f"{provider} rejected the API key (HTTP {response.status_code}).")
            if response.status_code >= 500:
                last_error = f"HTTP {response.status_code}: {response.text[:200]}"
            elif response.is_success:
                return response.json()
            else:
                raise ProviderError(f"{provider} returned HTTP {response.status_code}: {response.text[:200]}")
        if attempt < retries:
            await asyncio.sleep(min(2 ** attempt, 15))
    raise ProviderError(f"{provider} failed after {retries} attempts ({last_error}).")


class TavilyClient:
    URL = "https://api.tavily.com/search"

    def __init__(self, settings: Settings, client: httpx.AsyncClient, before_call: UsageHook):
        self.settings, self.client, self.before_call = settings, client, before_call

    async def search(self, query: str, include_domains: list[str], max_results: int = 6) -> dict[str, Any]:
        await self.before_call("tavily")
        return await _post_json(
            self.client,
            self.URL,
            headers={"Authorization": f"Bearer {self.settings.tavily_api_key}"},
            payload={
                "query": query,
                "search_depth": "basic",
                "max_results": max_results,
                "include_domains": include_domains,
                "include_raw_content": "text",
                "include_images": True,
                "include_image_descriptions": True,
            },
            retries=self.settings.http_retries,
            provider="Tavily",
            quota_statuses={429, 432, 433, 402},
        )


async def inspect_ollama(settings: Settings, client: httpx.AsyncClient | None = None) -> dict[str, Any]:
    """Ask the local Ollama server which models are installed and which one will be used.

    Never raises: returns {"reachable": bool, "models": [...], "model": str | None, "error": str | None}.
    If OLLAMA_MODEL is blank the first installed non-embedding model is selected; if it is set but
    not installed the result carries an explanatory error instead of silently picking another one.
    """
    owns = client is None
    client = client or httpx.AsyncClient(timeout=5)
    try:
        response = await client.get(f"{settings.ollama_base_url}/api/tags", timeout=5)
        response.raise_for_status()
        entries = response.json().get("models", [])
    except (httpx.HTTPError, ValueError) as exc:
        return {"reachable": False, "models": [], "model": None,
                "error": f"Ollama is not reachable at {settings.ollama_base_url} ({type(exc).__name__}). Start the Ollama app/service."}
    finally:
        if owns:
            await client.aclose()
    names = [m.get("name") or m.get("model") for m in entries if m.get("name") or m.get("model")]
    usable = [(m.get("name") or m.get("model")) for m in entries
              if "embed" not in (m.get("name") or m.get("model") or "").lower()
              and "completion" in (m.get("capabilities") or ["completion"])]
    result: dict[str, Any] = {"reachable": True, "models": names, "model": None, "error": None}
    if settings.ollama_model:
        if settings.ollama_model in names or f"{settings.ollama_model}:latest" in names:
            result["model"] = settings.ollama_model
        else:
            result["error"] = (f"Model '{settings.ollama_model}' is not installed. Installed: "
                               f"{', '.join(names) or 'none'}. Run `ollama pull {settings.ollama_model}` or change OLLAMA_MODEL.")
    elif usable:
        result["model"] = usable[0]
    else:
        result["error"] = "No chat-capable model is installed in Ollama. Run `ollama pull <model>`."
    return result


class OllamaClient:
    """Local LLM extraction via Ollama's /api/chat (no API key, no quota)."""

    def __init__(self, settings: Settings, client: httpx.AsyncClient, before_call: UsageHook):
        self.settings, self.client, self.before_call = settings, client, before_call
        self.model: str | None = settings.ollama_model or None

    async def _resolve_model(self) -> str:
        if self.model:
            return self.model
        info = await inspect_ollama(self.settings, self.client)
        if not info["model"]:
            raise ProviderError(info["error"] or "No Ollama model available.")
        self.model = info["model"]
        return self.model

    async def extract_json(self, system: str, user: str) -> dict[str, Any]:
        model = await self._resolve_model()
        await self.before_call("llm")
        data = await _post_json(
            self.client,
            f"{self.settings.ollama_base_url}/api/chat",
            headers={},
            payload={
                "model": model,
                "stream": False,
                "format": "json",
                "think": False,  # reasoning models: skip chain-of-thought, we only need the JSON
                "options": {"temperature": 0, "num_ctx": 8192},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            retries=min(self.settings.http_retries, 2),
            provider="Ollama",
            quota_statuses=set(),
            timeout=self.settings.ollama_timeout,
        )
        try:
            parsed = json.loads(data["message"]["content"])
        except (KeyError, TypeError, json.JSONDecodeError) as exc:
            raise ProviderError(f"Ollama returned malformed JSON: {exc}") from exc
        if not isinstance(parsed, dict):
            raise ProviderError("Ollama returned a non-object JSON payload.")
        return parsed
