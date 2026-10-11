"""Deterministic validation, cross-checking and merging of LLM extractions.

Principle: the LLM is only a *reader*. A value is accepted only if
  1. the quote the model cites literally exists in the retrieved source text,
  2. the value is actually contained in that quote (numbers / lakh-crore prices /
     wording), and
  3. the value passes unit and plausibility checks.
Accepted values are then cross-checked between independent domains. Nothing is
ever labelled "verified" here: the output is a *review recommendation* for an
administrator, with every issue and conflict kept for the audit trail.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Any

from .config import Settings, host_matches

KEY_FIELDS = ("price", "horsepower", "torque", "mileage", "engine", "fuel_type", "transmission", "seating_capacity")
IMPORTANT_NUMERIC = {"price", "horsepower", "torque", "mileage"}
CATEGORIES = ("sedan", "suv", "hatchback", "truck", "coupe", "convertible", "electric", "hybrid")

CATEGORY_TERMS = {
    "sedan": ("sedan",),
    "suv": ("suv", "sport utility vehicle", "compact suv", "sub-4m suv"),
    "hatchback": ("hatchback",),
    "truck": ("truck", "pickup", "pick-up"),
    "coupe": ("coupe", "coupé"),
    "convertible": ("convertible", "cabriolet"),
    "electric": ("electric vehicle", "battery electric", "bev", "electric car", "electric suv", "ev"),
    "hybrid": ("plug-in hybrid", "hybrid", "phev", "hev"),
}

# unit -> (canonical unit, multiplier to canonical)
HP_UNITS = {"bhp": ("bhp", 1.0), "hp": ("bhp", 1.0), "ps": ("bhp", 0.98632), "kw": ("bhp", 1.34102)}
TORQUE_UNITS = {"nm": ("nm", 1.0), "kgm": ("nm", 9.80665), "kgf-m": ("nm", 9.80665), "kgfm": ("nm", 9.80665)}
MILEAGE_UNITS = {"kmpl": "kmpl", "km/l": "kmpl", "km/kg": "km/kg", "km": "km"}

RANGES = {
    "price": (150_000, 150_000_000),          # INR
    "horsepower": (30, 1500),                  # canonical bhp
    "torque": (40, 2500),                      # canonical Nm
    "seating_capacity": (2, 9),
    "mileage": {"kmpl": (3, 45), "km/kg": (5, 45), "km": (60, 1200)},
}


@dataclass
class Claim:
    field: str
    value: Any                 # value as it will be stored
    unit: str | None
    quote: str
    comparable: Any            # normalised value used for cross-checking
    source_url: str
    source_title: str
    domain: str
    tier: str                  # primary | secondary


@dataclass
class Issue:
    severity: str              # info | warn | error
    code: str
    message: str
    field: str | None = None

    def asdict(self) -> dict[str, Any]:
        return {"severity": self.severity, "code": self.code, "message": self.message, "field": self.field}


@dataclass
class SourceDoc:
    url: str
    title: str
    domain: str
    tier: str
    text: str                  # text that was shown to the LLM (quotes are checked against it)
    images: list[dict[str, str]] = field(default_factory=list)


# ---------- text helpers ----------

def norm(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip().casefold()


def quote_in_text(quote: Any, text: str) -> bool:
    q = norm(quote)
    return len(q) >= 3 and q in norm(text)


_NUM = re.compile(r"(?<![\d.])\d[\d,]*(?:\.\d+)?")


def numbers_in(quote: str) -> list[Decimal]:
    out = []
    for token in _NUM.findall(quote):
        try:
            out.append(Decimal(token.replace(",", "")))
        except InvalidOperation:
            pass
    return out


def amounts_inr(quote: str) -> list[Decimal]:
    """All rupee amounts found in a quote, expanding 'lakh' / 'crore' suffixes."""
    amounts: list[Decimal] = []
    for match in re.finditer(r"(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr\b|l\b)?", quote, re.IGNORECASE):
        try:
            number = Decimal(match.group(1).replace(",", ""))
        except InvalidOperation:
            continue
        suffix = (match.group(2) or "").lower()
        if suffix.startswith(("lakh", "lac")) or suffix == "l":
            number *= 100_000
        elif suffix.startswith("cr"):
            number *= 10_000_000
        amounts.append(number)
    return amounts


def _number_in_quote(value: Any, quote: str, tolerance: float = 0.0) -> bool:
    try:
        expected = Decimal(str(value))
    except InvalidOperation:
        return False
    for candidate in numbers_in(quote):
        if tolerance:
            if expected and abs(candidate - expected) / expected <= Decimal(str(tolerance)):
                return True
        elif candidate == expected:
            return True
    return False


# ---------- per-source claim building ----------

def _entry(extraction: dict[str, Any], name: str) -> dict[str, Any] | None:
    fields = extraction.get("fields") if isinstance(extraction.get("fields"), dict) else extraction
    entry = fields.get(name) if isinstance(fields, dict) else None
    if not isinstance(entry, dict) or entry.get("value") in (None, ""):
        return None
    return entry


def _to_number(value: Any) -> float | None:
    try:
        if isinstance(value, bool):
            return None
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def build_claims(extraction: dict[str, Any], doc: SourceDoc, issues: list[Issue]) -> dict[str, Claim]:
    """Turn one LLM extraction into evidence-backed claims. Rejected values are
    dropped (stored as null later) and logged as issues."""
    claims: dict[str, Claim] = {}

    def reject(name: str, reason: str) -> None:
        issues.append(Issue("info", "claim_rejected", f"{doc.domain}: {name} discarded - {reason}.", name))

    def make(name: str, value: Any, unit: str | None, quote: str, comparable: Any) -> None:
        claims[name] = Claim(name, value, unit, str(quote).strip(), comparable, doc.url, doc.title, doc.domain, doc.tier)

    for name in KEY_FIELDS + ("variant", "model_year", "category"):
        entry = _entry(extraction, name)
        if not entry:
            continue
        quote = entry.get("quote")
        if not quote_in_text(quote, doc.text):
            reject(name, "supporting quote was not found in the source text")
            continue
        raw, unit = entry.get("value"), norm(entry.get("unit")) or None

        if name == "price":
            amount = _to_number(raw)
            if amount is None or not any(abs(Decimal(str(amount)) - a) <= Decimal(str(amount)) * Decimal("0.005") for a in amounts_inr(quote)):
                reject(name, "value is not stated in its quote")
                continue
            lo, hi = RANGES["price"]
            if not lo <= amount <= hi:
                reject(name, f"price {amount:,.0f} outside plausible range")
                continue
            if not re.search(r"₹|rs\.?|inr|lakh|lac|crore|ex-showroom", norm(quote)):
                reject(name, "quote does not identify the amount as a rupee price")
                continue
            make(name, round(amount), "INR", quote, round(amount))
        elif name == "horsepower":
            amount = _to_number(raw)
            if amount is None or unit not in HP_UNITS or not _number_in_quote(amount, quote):
                reject(name, "value/unit not supported by its quote")
                continue
            canonical, factor = HP_UNITS[unit]
            comparable = amount * factor
            if not RANGES["horsepower"][0] <= comparable <= RANGES["horsepower"][1]:
                reject(name, f"{amount} {unit} outside plausible range")
                continue
            make(name, amount, unit, quote, comparable)
        elif name == "torque":
            amount = _to_number(raw)
            if amount is None or unit not in TORQUE_UNITS or not _number_in_quote(amount, quote):
                reject(name, "value/unit not supported by its quote")
                continue
            canonical, factor = TORQUE_UNITS[unit]
            comparable = amount * factor
            if not RANGES["torque"][0] <= comparable <= RANGES["torque"][1]:
                reject(name, f"{amount} {unit} outside plausible range")
                continue
            make(name, amount, unit, quote, comparable)
        elif name == "mileage":
            amount = _to_number(raw)
            canonical_unit = MILEAGE_UNITS.get(unit or "")
            if amount is None or not canonical_unit or not _number_in_quote(amount, quote):
                reject(name, "value/unit not supported by its quote")
                continue
            lo, hi = RANGES["mileage"][canonical_unit]
            if not lo <= amount <= hi:
                reject(name, f"{amount} {canonical_unit} outside plausible range")
                continue
            make(name, amount, canonical_unit, quote, (canonical_unit, amount))
        elif name == "seating_capacity":
            amount = _to_number(raw)
            if amount is None or amount != int(amount) or not _number_in_quote(amount, quote):
                reject(name, "value not supported by its quote")
                continue
            lo, hi = RANGES["seating_capacity"]
            if not lo <= amount <= hi:
                reject(name, f"seating {amount} outside plausible range")
                continue
            make(name, int(amount), None, quote, int(amount))
        elif name == "model_year":
            amount = _to_number(raw)
            if amount is None or not re.search(rf"(?<!\d){int(amount)}(?!\d)", str(quote)):
                reject(name, "year not stated in its quote")
                continue
            make(name, int(amount), None, quote, int(amount))
        elif name == "category":
            value = norm(raw)
            terms = [t for t in CATEGORY_TERMS.get(value, ())]
            matched = {c for c, ts in CATEGORY_TERMS.items() if any(re.search(rf"(?<![a-z]){re.escape(t)}(?![a-z])", norm(quote)) for t in ts)}
            if value not in CATEGORIES or not terms or matched != {value}:
                reject(name, "category is not explicitly and unambiguously stated in its quote")
                continue
            make(name, value, None, quote, value)
        else:  # engine, fuel_type, transmission, variant -> wording must appear in quote
            value = re.sub(r"\s+", " ", str(raw)).strip()
            if norm(value) not in norm(quote) or len(value) > 160:
                reject(name, "wording is not contained in its quote")
                continue
            make(name, value, None, quote, norm(value))

    # Optional free-form specifications (each needs its own quote).
    specs = extraction.get("specifications")
    if isinstance(specs, dict):
        accepted: dict[str, str] = {}
        for label, entry in list(specs.items())[:12]:
            if isinstance(entry, dict) and entry.get("value") and quote_in_text(entry.get("quote"), doc.text) \
                    and norm(entry["value"]) in norm(entry["quote"]):
                accepted[str(label)[:80]] = str(entry["value"])[:200]
        if accepted:
            claims["specifications"] = Claim("specifications", accepted, None, "", accepted, doc.url, doc.title, doc.domain, doc.tier)
    return claims


def page_matches_target(doc: SourceDoc, brand: str, model: str) -> bool:
    text = norm(doc.text[:60_000] + " " + doc.title + " " + doc.url)
    model_tokens = [t for t in re.split(r"[\s\-]+", norm(model)) if t]
    return bool(model_tokens) and all(t in text for t in model_tokens) and norm(brand).split()[0] in text


# ---------- cross-checking ----------

def _agree(name: str, a: Any, b: Any) -> bool:
    if name == "price":
        return abs(a - b) <= max(a, b) * 0.005
    if name in ("horsepower", "torque"):
        return abs(a - b) <= max(a, b) * 0.03
    if name == "mileage":
        return a[0] == b[0] and abs(a[1] - b[1]) <= max(a[1], b[1]) * 0.03
    if name == "engine":
        digits = lambda s: set(re.findall(r"\d{3,4}\s?cc|\d\.\d\s?l", s))  # noqa: E731
        return a == b or a in b or b in a or (digits(a) and digits(a) == digits(b))
    if name in ("fuel_type", "transmission"):
        return a == b or a in b or b in a
    return a == b


TIER_RANK = {"primary": 0, "secondary": 1}


def merge_claims(target: dict[str, Any], docs: list[SourceDoc], per_doc_claims: list[dict[str, Claim]], issues: list[Issue]) -> dict[str, Any]:
    """Cross-check claims between sources and assemble the review-ready record."""
    brand, model, year = target["brand"], target["model"], int(target["year"])
    field_status: dict[str, str] = {}
    conflicts: list[dict[str, Any]] = []
    chosen: dict[str, Claim] = {}
    corroboration: dict[str, list[str]] = {}

    # Model-year reconciliation: a source that states a different year describes a different car.
    year_claims = [c["model_year"] for c in per_doc_claims if "model_year" in c]
    year_confirmed = any(c.value == year for c in year_claims)
    mismatched = {c.source_url for c in year_claims if c.value != year}
    if mismatched:
        issues.append(Issue("warn", "year_mismatch", f"Sources describing a different model year were excluded: {', '.join(sorted(mismatched))}.", "launchYear"))
        per_doc_claims = [c for c in per_doc_claims if not ("model_year" in c and c["model_year"].value != year)]
    if not year_confirmed:
        issues.append(Issue("warn", "year_unconfirmed", f"No source explicitly states model year {year}; the year comes from the ingestion target.", "launchYear"))

    for name in KEY_FIELDS + ("variant", "category"):
        claims = sorted((c[name] for c in per_doc_claims if name in c), key=lambda c: TIER_RANK[c.tier])
        if not claims:
            field_status[name] = "missing"
            if name in KEY_FIELDS:
                issues.append(Issue("warn", "missing_field", f"No source stated {name}; stored as null.", name))
            continue
        groups: list[list[Claim]] = []
        for claim in claims:
            for group in groups:
                if _agree(name, group[0].comparable, claim.comparable):
                    group.append(claim)
                    break
            else:
                groups.append([claim])
        if len(groups) > 1:
            field_status[name] = "conflict"
            conflicts.append({"field": name, "values": [{"value": g[0].value, "unit": g[0].unit, "sourceUrl": g[0].source_url, "quote": g[0].quote} for g in groups]})
            issues.append(Issue("error", "conflict", f"Sources disagree on {name}: " + " vs ".join(f"{g[0].value}{' ' + g[0].unit if g[0].unit else ''} ({g[0].domain})" for g in groups) + "; value left null.", name))
            continue
        group = groups[0]
        domains = {c.domain for c in group}
        chosen[name] = group[0]
        corroboration[name] = sorted({c.source_url for c in group[1:]})
        if len(domains) >= 2:
            field_status[name] = "cross_checked"
        else:
            field_status[name] = "single_source"
            if name in KEY_FIELDS:
                severity = "warn" if name in IMPORTANT_NUMERIC else "info"
                issues.append(Issue(severity, "single_source", f"{name} is supported by one domain only ({group[0].domain}); not cross-checked.", name))

    # Deterministic category fallback for EVs; otherwise leave null for the admin to set.
    if "category" not in chosen:
        fuel = chosen.get("fuel_type")
        if field_status.get("category") == "missing" and fuel and fuel.comparable == "electric":
            category, category_source = "electric", fuel
            field_status["category"] = "derived_from_fuel_type"
            issues.append(Issue("info", "category_derived", "Category derived from a source-stated electric fuel type.", "category"))
        else:
            category = category_source = None
            issues.append(Issue("warn", "category_missing", "No source explicitly states the body category; an admin must choose one before approval.", "category"))
    else:
        category, category_source = chosen["category"].value, chosen["category"]

    primary_docs = [d for d in docs if d.tier == "primary"]
    if not primary_docs:
        issues.append(Issue("warn", "no_primary_source", "No official manufacturer page was retrieved; only secondary sources are available.", None))
    anchor = (primary_docs or docs)[0]

    field_sources: dict[str, dict[str, Any]] = {}

    def attach(key: str, claim: Claim | None, name: str | None = None) -> None:
        if claim is None:
            return
        field_sources[key] = {
            "sourceTitle": claim.source_title, "sourceUrl": claim.source_url,
            "sourceName": claim.domain, "quote": claim.quote,
            "status": field_status.get(name or key, "single_source"),
            "corroboratedBy": corroboration.get(name or key, []),
        }

    def value(name: str) -> Any:
        return chosen[name].value if name in chosen else None

    def unit(name: str) -> Any:
        return chosen[name].unit if name in chosen else None

    for key, name in (("priceAmount", "price"), ("horsepower", "horsepower"), ("torque", "torque"), ("mileage", "mileage"),
                      ("engine", "engine"), ("fuelType", "fuel_type"), ("transmission", "transmission"),
                      ("seatingCapacity", "seating_capacity"), ("variant", "variant"), ("category", "category")):
        attach(key, chosen.get(name) if key != "category" else category_source, name)
    if year_confirmed:
        attach("launchYear", next(c for c in year_claims if c.value == year), "launchYear")
        field_status["launchYear"] = "single_source"

    specifications: dict[str, str] = {}
    for claims in per_doc_claims:
        if "specifications" in claims:
            for label, spec_value in claims["specifications"].value.items():
                specifications.setdefault(label, spec_value)

    has_blocking = any(i.severity in ("error", "warn") for i in issues)
    return {
        "brand": brand, "model": model, "variant": value("variant") or "", "launchYear": year,
        "category": category,
        "priceAmount": value("price"), "priceCurrency": "INR" if value("price") is not None else None,
        "engine": value("engine"),
        "horsepower": value("horsepower"), "horsepowerUnit": unit("horsepower"),
        "torque": value("torque"), "torqueUnit": unit("torque"),
        "mileage": value("mileage"), "mileageUnit": unit("mileage"),
        "fuelType": value("fuel_type"), "transmission": value("transmission"),
        "seatingCapacity": value("seating_capacity"),
        "specifications": specifications,
        "fieldSources": field_sources,
        "_anchor": anchor,
        "_validation": {
            "recommendation": "needs_attention" if has_blocking else "ready_for_review",
            "issues": [i.asdict() for i in issues],
            "fieldStatus": field_status,
            "conflicts": conflicts,
            "note": "Automated evidence checks only - not independent verification. Admin approval is required.",
        },
    }
