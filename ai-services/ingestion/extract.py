"""Prompting and source-text preparation for Mistral extraction.

One LLM call per retained source page. Only spec-relevant passages are sent to
keep token use (and free-tier quota) low; the *same* condensed text is later
used to verify the model's quotes, so the model cannot cite what it never saw.
"""
from __future__ import annotations

import re

SYSTEM_PROMPT = """You are a careful automotive data extraction engine for the Indian market.
Read ONLY the provided source text. Never use prior knowledge, never estimate, convert units,
or infer. If the text does not explicitly state a value for the requested car, return null.

Return a single JSON object:
{
  "fields": {
    "variant":          {"value": str, "quote": str} | null,
    "model_year":       {"value": int, "quote": str} | null,
    "category":         {"value": "sedan|suv|hatchback|truck|coupe|convertible|electric|hybrid", "quote": str} | null,
    "price":            {"value": number in INR rupees, "quote": str} | null,
    "engine":           {"value": str, "quote": str} | null,
    "horsepower":       {"value": number, "unit": "bhp|ps|kw|hp", "quote": str} | null,
    "torque":           {"value": number, "unit": "nm|kgm", "quote": str} | null,
    "mileage":          {"value": number, "unit": "kmpl|km/kg|km", "quote": str} | null,
    "fuel_type":        {"value": str, "quote": str} | null,
    "transmission":     {"value": str, "quote": str} | null,
    "seating_capacity": {"value": integer, "quote": str} | null
  },
  "specifications": {"<label>": {"value": str, "quote": str}}
}
Rules:
- Every non-null entry MUST include "quote": a short exact passage copied verbatim from the source text that contains the value.
- price: the ex-showroom starting price only, converted to plain rupees (7.99 Lakh -> 799000) and only if the quote says it is a price. Ignore on-road prices, EMIs and other cars.
- Use the base/entry variant's figures unless the quote names a specific variant; then put that variant name in "variant".
- For electric cars give driving range in km as "mileage" with unit "km" only if the text states certified range.
- "value" for engine, fuel_type, transmission and variant must be copied wording found inside its quote.
- Describe only the requested car and model year. If the page is about another car, return all nulls.
- "specifications" may hold at most 8 extra facts (e.g. boot space, ground clearance, battery capacity), each with a quote.
- Output JSON only."""

KEYWORDS = re.compile(
    r"(price|ex-showroom|₹|\brs\.?\b|lakh|crore|bhp|\bps\b|\bkw\b|torque|\bnm\b|kgm|mileage|kmpl|km/l|km/kg|range|"
    r"seat|engine|displacement|\bcc\b|petrol|diesel|cng|electric|hybrid|transmission|manual|automatic|\bamt\b|"
    r"\bcvt\b|\bdct\b|suv|sedan|hatchback|variant|model year|boot|ground clearance|battery)",
    re.IGNORECASE,
)


def condense(text: str, limit: int = 9000) -> str:
    """Keep the opening paragraph plus the sentences/lines that mention specs."""
    text = re.sub(r"[ \t]+", " ", text or "")
    pieces = [p.strip() for p in re.split(r"(?<=[.!?])\s+|\n+", text) if p.strip()]
    head = text[:600].strip()
    kept: list[str] = []
    size = len(head)
    for piece in pieces:
        if KEYWORDS.search(piece) and len(piece) <= 600:
            if size + len(piece) > limit:
                break
            kept.append(piece)
            size += len(piece) + 1
    return (head + "\n" + "\n".join(kept)).strip()


def user_prompt(target: dict, title: str, url: str, text: str) -> str:
    return (
        f"Requested car: {target['brand']} {target['model']} (model year {target['year']}), India market.\n"
        f"Source title: {title or '(none)'}\nSource URL: {url}\n\nSOURCE TEXT:\n{text}"
    )
