import asyncio
import json
import logging
import os
import re
from decimal import Decimal, InvalidOperation
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Literal, TypedDict
from urllib.parse import parse_qsl, quote_plus, urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("speedhype.car-ingestion")
load_dotenv()


class ExtractedCar(BaseModel):
    brand: str | None = None
    model: str | None = None
    variant: str | None = None
    launch_year: int | None = None
    category: Literal["sedan", "suv", "hatchback", "truck", "coupe", "convertible", "electric", "hybrid"] | None = None
    price_amount: float | None = None
    price_currency: str | None = None
    engine: str | None = None
    horsepower: float | None = None
    horsepower_unit: str | None = None
    torque: float | None = None
    torque_unit: str | None = None
    mileage: float | None = None
    mileage_unit: str | None = None
    fuel_type: str | None = None
    transmission: str | None = None
    seating_capacity: int | None = None
    specifications: dict[str, str] = Field(default_factory=dict)
    evidence: dict[str, str] = Field(default_factory=dict)


class IngestionState(TypedDict, total=False):
    sources: list[dict[str, Any]]
    pages: list[dict[str, Any]]
    candidates: list[dict[str, Any]]
    valid_records: list[dict[str, Any]]
    reconciled_records: list[dict[str, Any]]
    discovered_pages: list[dict[str, Any]]
    errors: list[str]
    submitted: int


def structured_extractor() -> Any:
    return ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        temperature=0,
        api_key=os.environ["OPENAI_API_KEY"],
        base_url=os.getenv("OPENAI_BASE_URL") or None,
    ).with_structured_output(ExtractedCar)


def configured_sources() -> list[dict[str, Any]]:
    raw = os.getenv("CAR_SOURCE_URLS", "[]")
    try:
        sources = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("CAR_SOURCE_URLS must be a JSON array.") from exc
    if not isinstance(sources, list):
        raise ValueError("CAR_SOURCE_URLS must be a JSON array.")
    return sources


def approved_domains() -> set[str]:
    return {
        domain.strip().lower()
        for domain in os.getenv("CAR_SOURCE_ALLOWED_DOMAINS", "").split(",")
        if domain.strip()
    }


def has_safe_source_url(value: str) -> bool:
    parsed = urlparse(value)
    sensitive_fragments = ("key", "token", "auth", "signature", "secret", "password")
    return (
        parsed.scheme == "https"
        and parsed.hostname is not None
        and not parsed.username
        and not parsed.password
        and not any(
            fragment in key.lower()
            for key, _ in parse_qsl(parsed.query)
            for fragment in sensitive_fragments
        )
    )


def policy_is_configured() -> bool:
    if os.getenv("SOURCE_POLICY_APPROVED", "").lower() != "true":
        return False
    try:
        sources = configured_sources()
    except ValueError:
        return False
    domains = approved_domains()
    if not sources or len(sources) > 100 or not domains:
        return False
    for source in sources:
        if not isinstance(source, dict) or source.get("terms_reviewed") is not True:
            return False
        url = source.get("url", "")
        if not isinstance(url, str) or not has_safe_source_url(url):
            return False
        host = (urlparse(url).hostname or "").lower()
        if host not in domains:
            return False
        if not source.get("source_name") or not source.get("license"):
            return False
        if source.get("page_type", "detail") not in {"detail", "listing"}:
            return False
        if source.get("page_type") == "listing":
            pattern = source.get("product_link_pattern")
            try:
                if not pattern or len(pattern) > 200:
                    return False
                re.compile(pattern)
            except (TypeError, re.error):
                return False
        search_template = source.get("search_url_template")
        if search_template:
            if not isinstance(search_template, str) or search_template.count("{query}") != 1:
                return False
            sample_url = search_template.replace("{query}", quote_plus("vehicle model year"))
            if not has_safe_source_url(sample_url):
                return False
            if (urlparse(sample_url).hostname or "").lower() != host:
                return False
            pattern = source.get("product_link_pattern")
            try:
                if not pattern or len(pattern) > 200:
                    return False
                re.compile(pattern)
            except (TypeError, re.error):
                return False
    return True


def agent_is_configured() -> bool:
    return bool(
        policy_is_configured()
        and os.getenv("OPENAI_API_KEY")
        and os.getenv("CAR_INGESTION_SHARED_SECRET")
        and os.getenv("EXPRESS_API_URL")
    )


def check_secret(authorization: str | None) -> None:
    configured = os.getenv("CAR_INGESTION_SHARED_SECRET", "")
    supplied = (authorization or "").removeprefix("Bearer ").strip()
    if not configured:
        raise HTTPException(status_code=503, detail="Agent control authentication is not configured.")
    import hmac

    if not hmac.compare_digest(configured, supplied):
        raise HTTPException(status_code=401, detail="Valid agent control credentials are required.")


async def fetch_allowed_page(client: httpx.AsyncClient, source: dict[str, Any]) -> dict[str, Any]:
    url = source["url"]
    if not source.get("terms_reviewed"):
        raise ValueError(f"Source terms were not reviewed: {url}")
    current_url = url
    response: httpx.Response | None = None
    for _ in range(6):
        parsed = urlparse(current_url)
        host = (parsed.hostname or "").lower()
        if host not in approved_domains() or not has_safe_source_url(current_url):
            raise ValueError(f"Source host or URL is not allowlisted: {host}")

        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        robots_response = await client.get(robots_url, follow_redirects=False)
        if 300 <= robots_response.status_code < 400:
            robots_location = robots_response.headers.get("location")
            if not robots_location:
                raise ValueError(f"Robots policy could not be verified for {host}.")
            robots_target = urljoin(robots_url, robots_location)
            if (urlparse(robots_target).hostname or "").lower() != host:
                raise ValueError(f"Robots policy for {host} redirects outside the approved host.")
            robots_response = await client.get(robots_target, follow_redirects=False)
        if robots_response.status_code == 404:
            robots_allowed = True
        elif robots_response.is_success:
            parser = RobotFileParser()
            parser.set_url(robots_url)
            parser.parse(robots_response.text.splitlines())
            robots_allowed = parser.can_fetch("SpeedHypeCarAgent", current_url)
        else:
            raise ValueError(f"Could not verify robots policy for {host} (HTTP {robots_response.status_code}).")
        if not robots_allowed:
            raise ValueError(f"Robots policy disallows automated access to {current_url}")

        response = await client.get(current_url, follow_redirects=False)
        if 300 <= response.status_code < 400:
            location = response.headers.get("location")
            if not location:
                raise ValueError(f"Source returned an invalid redirect: {current_url}")
            current_url = urljoin(current_url, location)
            continue
        response.raise_for_status()
        break
    else:
        raise ValueError(f"Too many redirects while fetching {url}")
    if response is None:
        raise ValueError(f"Could not fetch source page: {url}")
    if len(response.content) > 2_000_000:
        raise ValueError(f"Source page exceeds the 2 MB safety limit: {url}")
    soup = BeautifulSoup(response.text, "html.parser")
    for element in soup(["script", "style", "noscript", "svg"]):
        element.decompose()
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True)).strip()
    if not text:
        raise ValueError(f"No readable page text was returned by {url}")

    image_url = ""
    page_title = ""
    title_tag = soup.find("title")
    if title_tag:
        page_title = re.sub(r"\s+", " ", title_tag.get_text(" ", strip=True)).strip()
    if not page_title:
        title_meta = soup.find("meta", attrs={"property": "og:title"})
        if title_meta:
            page_title = str(title_meta.get("content", "")).strip()
    if source.get("image_reuse_permitted") is True:
        image_tag = soup.find("meta", attrs={"property": "og:image"})
        if image_tag and image_tag.get("content"):
            candidate = urljoin(url, str(image_tag["content"]))
            if has_safe_source_url(candidate) and (urlparse(candidate).hostname or "").lower() in approved_domains():
                image_url = candidate
    links = []
    for anchor in soup.find_all("a", href=True):
        candidate = urljoin(url, str(anchor["href"]))
        candidate_url = urlparse(candidate)
        if has_safe_source_url(candidate) and (candidate_url.hostname or "").lower() in approved_domains():
            links.append(candidate)
    return {
        **source,
        "text": text[:100_000],
        "title": page_title[:300],
        "image_url": image_url,
        "links": list(dict.fromkeys(links)),
    }


async def collect_sources(_: IngestionState) -> IngestionState:
    sources = configured_sources()
    pages: list[dict[str, Any]] = []
    errors: list[str] = []
    async with httpx.AsyncClient(
        timeout=20,
        follow_redirects=True,
        headers={"User-Agent": "SpeedHypeCarAgent/1.0 (contact: configured administrator)"},
    ) as client:
        for source in sources:
            if len(pages) >= 100:
                errors.append("Stopped after collecting the 100-page ingestion safety limit.")
                break
            try:
                listing = await fetch_allowed_page(client, source)
                if source.get("page_type", "detail") == "listing":
                    pattern = re.compile(source["product_link_pattern"])
                    matches = [
                        url for url in listing["links"]
                        if pattern.search(urlparse(url).path)
                    ][: min(max(int(source.get("max_pages", 40)), 1), 50, 100 - len(pages))]
                    if not matches:
                        errors.append(f"{source['url']}: no product links matched the configured path pattern.")
                    for product_url in matches:
                        try:
                            await asyncio.sleep(0.2)
                            pages.append(await fetch_allowed_page(
                                client,
                                {**source, "url": product_url, "page_type": "detail"},
                            ))
                        except (httpx.HTTPError, ValueError, KeyError) as exc:
                            message = f"{product_url}: {exc}"
                            logger.warning("Skipping source: %s", message)
                            errors.append(message)
                elif len(pages) < 100:
                    pages.append(listing)
            except (httpx.HTTPError, ValueError, KeyError) as exc:
                message = f"{source.get('url', '<invalid source>')}: {exc}"
                logger.warning("Skipping source: %s", message)
                errors.append(message)
    return {"sources": sources, "pages": pages, "errors": errors}


async def extract_candidates(state: IngestionState) -> IngestionState:
    model = structured_extractor()
    candidates, errors = await extract_pages(model, state.get("pages", []), state.get("errors", []))
    return {"candidates": candidates, "errors": errors}


async def extract_pages(
    model: Any,
    pages: list[dict[str, Any]],
    prior_errors: list[str],
) -> tuple[list[dict[str, Any]], list[str]]:
    candidates: list[dict[str, Any]] = []
    errors = list(prior_errors)
    for page in pages:
        prompt = (
            "You are an automotive data extraction engine. Extract technical specifications for exactly one "
            "vehicle only from this source document. Never use prior knowledge, calculate missing facts, or "
            "invent values. For EVERY populated field provide an exact quote copied from the source text under "
            "the evidence key with the same field name. Use null when unsupported. Do not assume a price; only "
            "populate price_amount and price_currency when both are explicitly stated. For ranges, use the "
            "published starting/base value and quote the range. Classify category only when the source explicitly "
            "states a category or body/powertrain style; choose exactly one of sedan, suv, hatchback, truck, "
            "coupe, convertible, electric, hybrid. Preserve model year exactly as stated in launch_year. "
            "If this page does not identify a single vehicle, brand/model/year should be null. Do not use "
            "marketing copy as a technical specification.\n\n"
            f"Source title: {page.get('title') or '(no title in document)'}\n"
            f"Source text:\n{page['text']}"
        )
        try:
            extracted = await model.ainvoke(prompt)
            candidates.append({"page": page, "extracted": extracted.model_dump()})
        except Exception as exc:
            message = f"{page['url']}: structured extraction failed: {exc}"
            logger.exception(message)
            errors.append(message)
    return candidates, errors


async def discover_missing_sources(state: IngestionState) -> IngestionState:
    missing_pages: list[dict[str, Any]] = []
    errors = list(state.get("errors", []))
    existing_urls = {page["url"] for page in state.get("pages", [])}
    search_sources = [source for source in state.get("sources", []) if source.get("search_url_template")]
    searched: set[tuple[str, str, int, str]] = set()
    if not search_sources:
        return {"discovered_pages": [], "errors": errors}

    async with httpx.AsyncClient(
        timeout=20,
        headers={"User-Agent": "SpeedHypeCarAgent/1.0 (contact: configured administrator)"},
    ) as client:
        for candidate in state.get("candidates", []):
            extracted = candidate["extracted"]
            if not all(extracted.get(field) for field in ("brand", "model", "launch_year")):
                continue
            evidence = extracted.get("evidence") or {}
            category_is_supported = category_has_explicit_evidence(
                extracted.get("category"),
                evidence.get("category"),
                candidate["page"]["text"],
            )
            specifications_are_supported = all(
                extracted.get(field) is not None and value_has_evidence(field, extracted[field], evidence, candidate["page"]["text"])
                for field in ("price_amount", "engine", "horsepower", "torque", "mileage", "fuel_type", "transmission", "seating_capacity")
            ) and (
                extracted.get("price_amount") is None
                or (
                    extracted.get("price_currency") is not None
                    and value_has_evidence("price_currency", extracted["price_currency"], evidence, candidate["page"]["text"])
                )
            )
            if specifications_are_supported and category_is_supported:
                continue
            search_terms = " ".join(
                str(value)
                for value in (extracted["brand"], extracted["model"], extracted.get("variant"), extracted["launch_year"])
                if value
            )
            for source in search_sources:
                if len(existing_urls) >= 100:
                    errors.append("Stopped source discovery at the 100-page ingestion safety limit.")
                    break
                identity = (
                    normalized_identity_part(extracted["brand"]),
                    normalized_identity_part(extracted["model"]),
                    int(extracted["launch_year"]),
                    normalized_identity_part(extracted.get("variant")),
                )
                search_key = (*identity, source["url"])
                if search_key in searched:
                    continue
                searched.add(search_key)
                search_url = source["search_url_template"].replace("{query}", quote_plus(search_terms))
                if not has_safe_source_url(search_url):
                    errors.append(f"{source['url']}: generated search URL failed HTTPS or query-secret checks.")
                    continue
                try:
                    search_page = await fetch_allowed_page(
                        client,
                        {**source, "url": search_url, "page_type": "search"},
                    )
                    pattern = re.compile(source["product_link_pattern"])
                    max_results = min(max(int(source.get("search_max_results", 3)), 1), 5)
                    result_urls = [
                        url for url in search_page["links"]
                        if pattern.search(urlparse(url).path) and url not in existing_urls
                    ][:max_results]
                    for result_url in result_urls:
                        if result_url in existing_urls:
                            continue
                        try:
                            await asyncio.sleep(0.2)
                            detail = await fetch_allowed_page(
                                client,
                                {**source, "url": result_url, "page_type": "detail"},
                            )
                            missing_pages.append(detail)
                            existing_urls.add(result_url)
                        except (httpx.HTTPError, ValueError, KeyError) as exc:
                            message = f"{result_url}: {exc}"
                            logger.warning("Skipping discovered source: %s", message)
                            errors.append(message)
                except (httpx.HTTPError, ValueError, KeyError) as exc:
                    message = f"{search_url}: {exc}"
                    logger.warning("Skipping source search: %s", message)
                    errors.append(message)
    return {"discovered_pages": missing_pages, "errors": errors}


async def extract_discovered_candidates(state: IngestionState) -> IngestionState:
    pages = state.get("discovered_pages", [])
    if not pages:
        return {"candidates": [], "errors": state.get("errors", [])}
    model = structured_extractor()
    candidates, errors = await extract_pages(model, pages, [])
    return {"candidates": state.get("candidates", []) + candidates, "errors": state.get("errors", []) + errors}


def quote_exists(quote: Any, text: str) -> bool:
    if not isinstance(quote, str) or not quote.strip():
        return False
    normalized_text = re.sub(r"\s+", " ", text).casefold()
    normalized_quote = re.sub(r"\s+", " ", quote).strip().casefold()
    return normalized_quote in normalized_text


def value_has_evidence(field: str, value: Any, evidence: dict[str, str], text: str) -> bool:
    quote = evidence.get(field)
    if not quote_exists(quote, text):
        return False
    if isinstance(value, (int, float)):
        try:
            expected = Decimal(str(value)).normalize()
            for token in re.findall(r"(?<![\d.])\d[\d,]*(?:\.\d+)?(?![\d.])", quote):
                if Decimal(token.replace(",", "")).normalize() == expected:
                    return True
        except InvalidOperation:
            return False
        return False
    normalized_value = re.sub(r"\s+", " ", str(value)).strip().casefold()
    normalized_quote = re.sub(r"\s+", " ", quote).strip().casefold()
    return bool(normalized_value and normalized_value in normalized_quote)


CATEGORY_TERMS = {
    "sedan": ("sedan",),
    "suv": ("suv", "sport utility vehicle"),
    "hatchback": ("hatchback",),
    "truck": ("truck", "pickup", "pick-up"),
    "coupe": ("coupe",),
    "convertible": ("convertible", "cabriolet"),
    "electric": ("electric vehicle", "battery electric", "bev", "ev", "electric"),
    "hybrid": ("plug-in hybrid", "hybrid", "phev", "hev"),
}


def category_has_explicit_evidence(category: Any, quote: Any, text: str) -> bool:
    if category not in CATEGORY_TERMS or not quote_exists(quote, text):
        return False
    normalized_quote = re.sub(r"\s+", " ", str(quote)).casefold()
    matched_categories = {
        candidate
        for candidate, terms in CATEGORY_TERMS.items()
        if any(
            re.search(rf"(?<![a-z]){re.escape(term)}(?![a-z])", normalized_quote)
            for term in terms
        )
    }
    return matched_categories == {category}


def normalized_identity_part(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip().casefold()


def validate_candidates(state: IngestionState) -> IngestionState:
    valid_records: list[dict[str, Any]] = []
    errors = list(state.get("errors", []))
    for candidate in state.get("candidates", []):
        page = candidate["page"]
        extracted = candidate["extracted"]
        evidence = extracted.get("evidence") or {}
        text = page["text"]
        if not all(
            extracted.get(field)
            and value_has_evidence(field, extracted[field], evidence, text)
            for field in ("brand", "model", "launch_year")
        ):
            errors.append(f"{page['url']}: rejected; brand, model, and launch year lack direct evidence.")
            continue
        category = extracted.get("category")
        category_evidence = evidence.get("category")
        if not category_has_explicit_evidence(category, category_evidence, text):
            errors.append(f"{page['url']}: rejected; category is not explicitly supported by the source.")
            continue

        variant = (
            extracted["variant"]
            if extracted.get("variant") and value_has_evidence("variant", extracted["variant"], evidence, text)
            else ""
        )
        verified_fields: dict[str, dict[str, Any]] = {}
        mapping = {
            "engine": "engine",
            "horsepower": "horsepower",
            "horsepower_unit": "horsepowerUnit",
            "torque": "torque",
            "torque_unit": "torqueUnit",
            "mileage": "mileage",
            "mileage_unit": "mileageUnit",
            "fuel_type": "fuelType",
            "transmission": "transmission",
            "seating_capacity": "seatingCapacity",
        }
        if extracted.get("price_amount") is not None and str(extracted.get("price_currency") or "").upper() == "INR":
            if (
                value_has_evidence("price_amount", extracted["price_amount"], evidence, text)
                and value_has_evidence("price_currency", extracted["price_currency"], evidence, text)
            ):
                verified_fields["priceAmount"] = {
                    "value": extracted["price_amount"],
                    "evidence": evidence["price_amount"],
                }
                verified_fields["priceCurrency"] = {
                    "value": "INR",
                    "evidence": evidence["price_currency"],
                }
        for source_field, target_field in mapping.items():
            value = extracted.get(source_field)
            if value is not None and value_has_evidence(source_field, value, evidence, text):
                verified_fields[target_field] = {"value": value, "evidence": evidence[source_field]}
        for key, value in (extracted.get("specifications") or {}).items():
            if value and value_has_evidence(key, value, evidence, text):
                verified_fields[f"specifications.{key}"] = {"value": value, "evidence": evidence[key]}
        for source_field, target_field in (
            ("horsepower_unit", "horsepowerUnit"),
            ("torque_unit", "torqueUnit"),
            ("mileage_unit", "mileageUnit"),
        ):
            value = extracted.get(source_field)
            if value and value_has_evidence(source_field, value, evidence, text):
                verified_fields[target_field] = {"value": value, "evidence": evidence[source_field]}
        if page.get("image_url"):
            images = [{
                "url": page["image_url"],
                "alt": f"{extracted['brand']} {extracted['model']}",
                "sourceUrl": page["url"],
                "license": page["license"],
            }]
        else:
            images = []
        valid_records.append({
            "brand": extracted["brand"].strip(),
            "model": extracted["model"].strip(),
            "variant": variant,
            "launchYear": extracted["launch_year"],
            "category": category,
            "categoryEvidence": category_evidence,
            "identityEvidence": {
                "brand": evidence["brand"],
                "model": evidence["model"],
                "launchYear": evidence["launch_year"],
            },
            "fieldClaims": verified_fields,
            "page": page,
            "images": images,
        })
    return {"valid_records": valid_records, "errors": errors}


def claim_value_key(value: Any) -> str:
    if isinstance(value, (int, float)):
        return str(Decimal(str(value)).normalize())
    return normalized_identity_part(value)


def reconcile_candidates(state: IngestionState) -> IngestionState:
    grouped: dict[tuple[str, str, int, str], list[dict[str, Any]]] = {}
    for candidate in state.get("valid_records", []):
        identity = (
            normalized_identity_part(candidate["brand"]),
            normalized_identity_part(candidate["model"]),
            candidate["launchYear"],
            normalized_identity_part(candidate["variant"]),
        )
        grouped.setdefault(identity, []).append(candidate)

    reconciled: list[dict[str, Any]] = []
    errors = list(state.get("errors", []))
    for candidates in grouped.values():
        categories = {candidate["category"] for candidate in candidates}
        if len(categories) != 1:
            errors.append(
                f"{candidates[0]['brand']} {candidates[0]['model']} {candidates[0]['launchYear']}: "
                "sources disagree on category; record skipped."
            )
            continue
        primary = candidates[0]
        record: dict[str, Any] = {
            "brand": primary["brand"],
            "model": primary["model"],
            "variant": primary["variant"],
            "launchYear": primary["launchYear"],
            "category": primary["category"],
            "sourceTitle": primary["page"].get("title", ""),
            "sourceUrl": primary["page"]["url"],
            "sourceName": primary["page"]["source_name"],
            "sourceLicense": primary["page"]["license"],
            "sourceLicenseUrl": primary["page"].get("license_url", ""),
            "images": [],
            "specifications": {},
            "fieldSources": {},
        }
        for field in ("brand", "model", "launchYear", "category"):
            quote = (
                primary["categoryEvidence"]
                if field == "category"
                else primary["identityEvidence"][field]
            )
            record["fieldSources"][field] = {
                "sourceTitle": primary["page"].get("title", ""),
                "sourceUrl": primary["page"]["url"],
                "sourceName": primary["page"]["source_name"],
                "quote": quote,
            }

        field_names = {
            field
            for candidate in candidates
            for field in candidate["fieldClaims"]
        }
        for field in field_names:
            claims: dict[str, dict[str, Any]] = {}
            for candidate in candidates:
                claim = candidate["fieldClaims"].get(field)
                if claim:
                    claim_key = claim_value_key(claim["value"])
                    claims.setdefault(claim_key, {"claim": claim, "candidate": candidate})
            if len(claims) != 1:
                if claims:
                    errors.append(
                        f"{primary['brand']} {primary['model']} {field}: conflicting source values; field omitted."
                    )
                continue
            unit_field = {
                "horsepower": "horsepowerUnit",
                "torque": "torqueUnit",
                "mileage": "mileageUnit",
            }.get(field)
            if unit_field:
                units = {
                    claim_value_key(candidate["fieldClaims"][unit_field]["value"])
                    for candidate in candidates
                    if unit_field in candidate["fieldClaims"]
                }
                if len(units) > 1:
                    errors.append(
                        f"{primary['brand']} {primary['model']} {field}: conflicting units; field omitted."
                    )
                    continue
            selected = next(iter(claims.values()))
            claim = selected["claim"]
            page = selected["candidate"]["page"]
            if field.startswith("specifications."):
                record["specifications"][field.partition(".")[2]] = claim["value"]
            else:
                record[field] = claim["value"]
            record["fieldSources"][field] = {
                "sourceTitle": page.get("title", ""),
                "sourceUrl": page["url"],
                "sourceName": page["source_name"],
                "quote": claim["evidence"],
            }

        for candidate in candidates:
            for image in candidate["images"]:
                if image["url"] not in {existing["url"] for existing in record["images"]}:
                    record["images"].append(image)
        reconciled.append(record)
    return {"reconciled_records": reconciled, "errors": errors}


async def publish_records(state: IngestionState) -> IngestionState:
    records = state.get("reconciled_records", [])
    if not records:
        return {"submitted": 0, "new_by_category": {}}
    url = f"{os.environ['EXPRESS_API_URL'].rstrip('/')}/car-catalog/ingestion/records"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json={"cars": records},
            headers={"Authorization": f"Bearer {os.environ['CAR_INGESTION_SHARED_SECRET']}"},
        )
        response.raise_for_status()
        result = response.json()
        return {
            "submitted": int(result.get("inserted", 0)),
            "new_by_category": result.get("newByCategory", {}),
        }


workflow_builder = StateGraph(IngestionState)
workflow_builder.add_node("collect_sources", collect_sources)
workflow_builder.add_node("extract_candidates", extract_candidates)
workflow_builder.add_node("validate_candidates", validate_candidates)
workflow_builder.add_node("reconcile_candidates", reconcile_candidates)
workflow_builder.add_node("discover_missing_sources", discover_missing_sources)
workflow_builder.add_node("extract_discovered_candidates", extract_discovered_candidates)
workflow_builder.add_node("publish_records", publish_records)
workflow_builder.add_edge(START, "collect_sources")
workflow_builder.add_edge("collect_sources", "extract_candidates")
workflow_builder.add_edge("extract_candidates", "discover_missing_sources")
workflow_builder.add_edge("discover_missing_sources", "extract_discovered_candidates")
workflow_builder.add_edge("extract_discovered_candidates", "validate_candidates")
workflow_builder.add_edge("validate_candidates", "reconcile_candidates")
workflow_builder.add_edge("reconcile_candidates", "publish_records")
workflow_builder.add_edge("publish_records", END)
workflow = workflow_builder.compile()

last_run: dict[str, Any] = {"status": "not_started", "completed_at": None, "submitted": 0, "errors": []}
run_lock = asyncio.Lock()
scheduled_task: asyncio.Task | None = None


async def run_ingestion() -> dict[str, Any]:
    global last_run
    if not agent_is_configured():
        raise RuntimeError("Configure an LLM key, internal API secret, and reviewed/allowlisted sources before ingestion.")
    if run_lock.locked():
        return {"status": "already_running", "message": "An ingestion run is already active."}
    async with run_lock:
        last_run = {"status": "running", "completed_at": None, "submitted": 0, "errors": []}
        try:
            result = await workflow.ainvoke({})
            last_run = {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "submitted": result.get("submitted", 0),
                "new_by_category": result.get("new_by_category", {}),
                "errors": result.get("errors", []),
                "source_count": len(result.get("sources", [])),
                "pages_read": len(result.get("pages", [])),
                "candidates_validated": len(result.get("valid_records", [])),
                "records_reconciled": len(result.get("reconciled_records", [])),
            }
            category_counts = result.get("new_by_category", {})
            last_run["category_counts"] = category_counts
            return last_run
        except Exception as exc:
            last_run = {
                "status": "failed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "submitted": 0,
                "errors": [str(exc)],
            }
            logger.exception("Vehicle ingestion failed")
            raise


async def scheduled_ingestion() -> None:
    interval = max(1, int(os.getenv("CAR_INGESTION_INTERVAL_HOURS", "24"))) * 3600
    while True:
        try:
            await run_ingestion()
        except Exception:
            logger.exception("Scheduled ingestion attempt failed; next attempt remains scheduled.")
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(_: FastAPI):
    global scheduled_task
    if agent_is_configured():
        scheduled_task = asyncio.create_task(scheduled_ingestion())
        logger.info("Scheduled car ingestion enabled.")
    else:
        logger.warning("Scheduled car ingestion disabled: provider/source policy or credentials are incomplete.")
    yield
    if scheduled_task:
        scheduled_task.cancel()
        try:
            await scheduled_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="SpeedHype Car Ingestion Agent", lifespan=lifespan)

# Tavily + Mistral pipeline with admin review (see docs/DATA_INGESTION_ARCHITECTURE.md).
from ingestion.api import router as ingestion_router  # noqa: E402

app.include_router(ingestion_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/status")
async def status(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    check_secret(authorization)
    try:
        source_count = len(configured_sources())
    except ValueError:
        source_count = 0
    return {
        **last_run,
        "configured": agent_is_configured(),
        "source_count": source_count,
    }


@app.post("/trigger", status_code=202)
async def trigger(authorization: str | None = Header(default=None)) -> dict[str, str]:
    check_secret(authorization)
    if not agent_is_configured():
        raise HTTPException(status_code=503, detail="The agent is not configured for source-safe ingestion.")
    if run_lock.locked():
        raise HTTPException(status_code=409, detail="An ingestion run is already active.")

    async def background_run() -> None:
        try:
            await run_ingestion()
        except Exception:
            logger.exception("Manually triggered ingestion failed.")

    asyncio.create_task(background_run())
    return {"status": "started", "message": "Ingestion started."}
