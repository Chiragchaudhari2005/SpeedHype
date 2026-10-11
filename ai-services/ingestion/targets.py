"""Curated list of India-market models to seed. The pipeline walks this list in
order and skips anything already in the database, so no LLM call is spent on
discovering *which* cars to ingest. Extend freely; the year is the model year
the search is scoped to and is only trusted when a source confirms it."""
from __future__ import annotations

TARGETS: list[dict] = [
    {"brand": "Maruti Suzuki", "model": "Swift", "year": 2025},
    {"brand": "Hyundai", "model": "Creta", "year": 2025},
    {"brand": "Tata", "model": "Nexon", "year": 2025},
    {"brand": "Honda", "model": "City", "year": 2025},
    {"brand": "Tata", "model": "Punch EV", "year": 2025},
    {"brand": "Mahindra", "model": "Thar Roxx", "year": 2025},
    {"brand": "Maruti Suzuki", "model": "Baleno", "year": 2025},
    {"brand": "Toyota", "model": "Urban Cruiser Hyryder", "year": 2025},
    {"brand": "Kia", "model": "Seltos", "year": 2025},
    {"brand": "Hyundai", "model": "Verna", "year": 2025},
    {"brand": "Mahindra", "model": "XUV700", "year": 2025},
    {"brand": "Skoda", "model": "Slavia", "year": 2025},
    {"brand": "Volkswagen", "model": "Virtus", "year": 2025},
    {"brand": "Tata", "model": "Harrier", "year": 2025},
    {"brand": "Maruti Suzuki", "model": "Brezza", "year": 2025},
    {"brand": "Toyota", "model": "Innova Hycross", "year": 2025},
    {"brand": "MG", "model": "Windsor EV", "year": 2025},
    {"brand": "Mahindra", "model": "Scorpio-N", "year": 2025},
    {"brand": "Hyundai", "model": "i20", "year": 2025},
    {"brand": "Tata", "model": "Tiago", "year": 2025},
]
