"""Settings and the source-trust policy for the AI ingestion pipeline.

All secrets are read from the Python service's own `.env` (never from the
frontend). Extraction runs on a local Ollama model (no API key, no quota);
limits only apply to Tavily web search.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()

# Official manufacturer domains (India market). Records whose evidence comes from
# these are "primary" sources; everything else on the secondary list is
# "secondary" and can only corroborate, not override, a primary source.
OFFICIAL_DOMAINS: dict[str, list[str]] = {
    "maruti suzuki": ["marutisuzuki.com", "nexaexperience.com"],
    "hyundai": ["hyundai.com"],
    "tata": ["tatamotors.com", "ev.tatamotors.com", "cars.tatamotors.com"],
    "mahindra": ["mahindra.com", "auto.mahindra.com"],
    "honda": ["hondacarindia.com"],
    "toyota": ["toyotabharat.com"],
    "kia": ["kia.com"],
    "skoda": ["skoda-auto.co.in"],
    "volkswagen": ["volkswagen.co.in"],
    "mg": ["mgmotor.co.in"],
    "renault": ["renault.co.in"],
    "nissan": ["nissan.in"],
}

DEFAULT_SECONDARY_DOMAINS = "autocarindia.com,cardekho.com,carwale.com,zigwheels.com"


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def host_matches(url_or_host: str, domain: str) -> bool:
    host = (urlparse(url_or_host).hostname or url_or_host).lower()
    domain = domain.lower()
    return host == domain or host.endswith("." + domain)


@dataclass(frozen=True)
class Settings:
    tavily_api_key: str
    mongo_uri: str
    mongo_db: str
    shared_secret: str
    ollama_base_url: str
    ollama_model: str  # empty -> auto-detect from /api/tags
    ollama_timeout: float
    secondary_domains: tuple[str, ...]
    max_cars_per_run: int
    max_tavily_searches_per_day: int
    max_tavily_searches_per_month: int
    http_timeout: float
    http_retries: int
    max_sources_per_car: int

    def official_domains_for(self, brand: str) -> list[str]:
        return OFFICIAL_DOMAINS.get(brand.strip().lower(), [])

    def source_tier(self, brand: str, url: str) -> str | None:
        """Return 'primary', 'secondary' or None (untrusted -> must be discarded)."""
        if any(host_matches(url, d) for d in self.official_domains_for(brand)):
            return "primary"
        if any(host_matches(url, d) for d in self.secondary_domains):
            return "secondary"
        return None


def load_settings() -> Settings:
    secondary = os.getenv("SECONDARY_SOURCE_DOMAINS", DEFAULT_SECONDARY_DOMAINS)
    return Settings(
        tavily_api_key=os.getenv("TAVILY_API_KEY", ""),
        mongo_uri=os.getenv("MONGO_URI", ""),
        mongo_db=os.getenv("MONGO_DB_NAME", ""),
        shared_secret=os.getenv("CAR_INGESTION_SHARED_SECRET", ""),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/"),
        ollama_model=os.getenv("OLLAMA_MODEL", "").strip(),
        ollama_timeout=float(os.getenv("OLLAMA_TIMEOUT", "300")),
        secondary_domains=tuple(d.strip().lower() for d in secondary.split(",") if d.strip()),
        max_cars_per_run=_int("MAX_CARS_PER_RUN", 25),
        max_tavily_searches_per_day=_int("MAX_TAVILY_SEARCHES_PER_DAY", 60),
        max_tavily_searches_per_month=_int("MAX_TAVILY_SEARCHES_PER_MONTH", 900),
        http_timeout=float(os.getenv("INGESTION_HTTP_TIMEOUT", "30")),
        http_retries=_int("INGESTION_HTTP_RETRIES", 3),
        max_sources_per_car=_int("MAX_SOURCES_PER_CAR", 3),
    )


def missing_config(settings: Settings) -> list[str]:
    required = {
        "TAVILY_API_KEY": settings.tavily_api_key,
        "MONGO_URI": settings.mongo_uri,
        "CAR_INGESTION_SHARED_SECRET": settings.shared_secret,
    }
    return [name for name, value in required.items() if not value]
