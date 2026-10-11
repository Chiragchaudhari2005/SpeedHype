"""Offline tests for the ingestion pipeline.

Tavily and Mistral are replaced by an httpx MockTransport serving *synthetic*
pages, so these tests prove the pipeline's behaviour (evidence checks,
cross-checking, review gating, idempotency, quota handling) - they do NOT
prove anything about real car data. The MongoDB-backed tests use a throw-away
database (`speedhype_pipeline_test`) on MONGO_URI and drop it afterwards; they
are skipped when MONGO_URI is not set.
"""
import json
import os
import re
import sys
import unittest
from dataclasses import replace
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ingestion.config import load_settings  # noqa: E402
from ingestion.validate import SourceDoc, Issue, build_claims, merge_claims  # noqa: E402

TARGET = {"brand": "Maruti Suzuki", "model": "Swift", "year": 2025}


def doc(domain="marutisuzuki.com", tier="primary", text=""):
    return SourceDoc(url=f"https://www.{domain}/swift", title="Swift", domain=f"www.{domain}", tier=tier, text=text)


class ValidationTests(unittest.TestCase):
    def test_fabricated_quote_is_rejected_and_value_is_null(self):
        d = doc(text="The Swift is a hatchback with a 1197 cc engine.")
        issues = []
        claims = build_claims({"fields": {"horsepower": {"value": 80, "unit": "bhp", "quote": "80 bhp of power"}}}, d, issues)
        self.assertNotIn("horsepower", claims)
        self.assertTrue(any(i.code == "claim_rejected" for i in issues))

    def test_value_must_be_inside_quote(self):
        d = doc(text="Peak power is 80 bhp at 5700 rpm.")
        claims = build_claims({"fields": {"horsepower": {"value": 90, "unit": "bhp", "quote": "Peak power is 80 bhp"}}}, d, [])
        self.assertNotIn("horsepower", claims)

    def test_lakh_price_is_converted_and_checked(self):
        d = doc(text="Ex-showroom price starts at Rs. 6.49 Lakh for the base variant.")
        ok = build_claims({"fields": {"price": {"value": 649000, "quote": "Ex-showroom price starts at Rs. 6.49 Lakh"}}}, d, [])
        bad = build_claims({"fields": {"price": {"value": 700000, "quote": "Ex-showroom price starts at Rs. 6.49 Lakh"}}}, d, [])
        self.assertEqual(ok["price"].value, 649000)
        self.assertNotIn("price", bad)

    def test_implausible_values_are_discarded(self):
        d = doc(text="It makes 9000 bhp.")
        self.assertNotIn("horsepower", build_claims({"fields": {"horsepower": {"value": 9000, "unit": "bhp", "quote": "It makes 9000 bhp"}}}, d, []))

    def test_unknown_unit_is_discarded(self):
        d = doc(text="Torque: 112 lb-ft")
        self.assertNotIn("torque", build_claims({"fields": {"torque": {"value": 112, "unit": "lb-ft", "quote": "Torque: 112 lb-ft"}}}, d, []))

    def test_cross_check_converts_units_and_marks_cross_checked(self):
        a = doc(text="Power: 81.58 bhp.")
        b = doc("autocarindia.com", "secondary", text="Power output is 82.7 PS.")
        ca = build_claims({"fields": {"horsepower": {"value": 81.58, "unit": "bhp", "quote": "Power: 81.58 bhp"}}}, a, [])
        cb = build_claims({"fields": {"horsepower": {"value": 82.7, "unit": "ps", "quote": "Power output is 82.7 PS"}}}, b, [])
        issues = []
        out = merge_claims(TARGET, [a, b], [ca, cb], issues)
        self.assertEqual(out["_validation"]["fieldStatus"]["horsepower"], "cross_checked")
        self.assertEqual(out["horsepower"], 81.58)       # primary source wins
        self.assertEqual(out["horsepowerUnit"], "bhp")

    def test_conflict_nulls_value_and_requires_attention(self):
        a = doc(text="Ex-showroom Rs. 6.49 Lakh")
        b = doc("cardekho.com", "secondary", text="Ex-showroom Rs. 7.20 Lakh")
        ca = build_claims({"fields": {"price": {"value": 649000, "quote": "Ex-showroom Rs. 6.49 Lakh"}}}, a, [])
        cb = build_claims({"fields": {"price": {"value": 720000, "quote": "Ex-showroom Rs. 7.20 Lakh"}}}, b, [])
        out = merge_claims(TARGET, [a, b], [ca, cb], [])
        self.assertIsNone(out["priceAmount"])
        self.assertEqual(out["_validation"]["recommendation"], "needs_attention")
        self.assertEqual(out["_validation"]["conflicts"][0]["field"], "price")

    def test_wrong_model_year_source_is_excluded(self):
        a = doc(text="2023 Swift price Rs. 5.99 Lakh ex-showroom")
        ca = build_claims({"fields": {
            "model_year": {"value": 2023, "quote": "2023 Swift"},
            "price": {"value": 599000, "quote": "Rs. 5.99 Lakh ex-showroom"}}}, a, [])
        out = merge_claims(TARGET, [a], [ca], [])
        self.assertIsNone(out["priceAmount"])

    def test_category_requires_explicit_quote(self):
        d = doc(text="The Swift is a very popular car.")
        self.assertNotIn("category", build_claims({"fields": {"category": {"value": "hatchback", "quote": "very popular car"}}}, d, []))
        d2 = doc(text="The Swift is a popular hatchback.")
        self.assertIn("category", build_claims({"fields": {"category": {"value": "hatchback", "quote": "popular hatchback"}}}, d2, []))


# ---------------------------------------------------------------- pipeline


BRANDS = {"Swift": "Maruti Suzuki", "Creta": "Hyundai", "Nexon": "Tata", "City": "Honda", "Punch EV": "Tata"}


def page(model, domain_kind, **v):
    """Synthetic page text; `v` overrides spec sentences."""
    body = [
        f"The {BRANDS[model]} {model} is a compact car sold in India. " * 4,
        f"Ex-showroom price starts at Rs. {v.get('price', '7.00')} Lakh.",
        f"The engine is a {v.get('engine', '1197 cc')} petrol engine." if not v.get("ev") else "It is a fully electric vehicle with a 35 kWh battery.",
        f"It delivers {v.get('hp', '80')} bhp of power and {v.get('tq', '110')} Nm of torque.",
        f"Certified {'range' if v.get('ev') else 'mileage'} is {v.get('mileage', '24.8')} {'km' if v.get('ev') else 'kmpl'}.",
        f"Seating capacity is {v.get('seats', 5)} persons.",
        f"The {model} is a {v.get('cat', 'hatchback')}.",
    ]
    return " ".join(body)


SCENARIOS = {
    # model -> list of (domain, kind, spec overrides)
    "Swift": [("www.marutisuzuki.com", {}), ("www.autocarindia.com", {"hp": "80"})],
    "Creta": [("www.hyundai.com", {"price": "11.00"}), ("www.cardekho.com", {"price": "12.50"})],
    "Nexon": [("www.tatamotors.com", {})],
    "City": [("www.autocarindia.com", {"cat": "sedan"})],
    "Punch EV": [("www.tatamotors.com", {"ev": True, "mileage": "315", "cat": "SUV", "price": "10.99"}),
                 ("www.carwale.com", {"ev": True, "mileage": "315", "price": "10.99", "cat": "SUV"})],
}


def make_transport(llm_status=200, fabricate_for=()):
    calls = {"tavily": 0, "llm": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        if request.url.host == "api.tavily.com":
            calls["tavily"] += 1
            query = body["query"]
            model = next((m for m in sorted(SCENARIOS, key=len, reverse=True) if m in query), None)
            official_only = len(body["include_domains"]) <= 3 and "autocarindia.com" not in body["include_domains"]
            results = []
            for domain, spec in SCENARIOS.get(model, []):
                is_official = not any(s in domain for s in ("autocar", "cardekho", "carwale"))
                if official_only and not is_official:
                    continue
                results.append({"url": f"https://{domain}/{model.lower().replace(' ', '-')}", "title": f"{model} specs",
                                "raw_content": page(model, "x", **spec)})
            return httpx.Response(200, json={"results": results, "images": [
                {"url": "https://www.tatamotors.com/img/car.jpg", "description": "front view"},
                {"url": "https://evil.example.com/car.jpg", "description": "should be dropped"}]})
        assert request.url.path == "/api/chat" and body["format"] == "json" and body["stream"] is False
        calls["llm"] += 1
        if llm_status != 200:
            return httpx.Response(llm_status, json={"error": "model runner crashed"})
        prompt = body["messages"][1]["content"]
        text = prompt.split("SOURCE TEXT:\n", 1)[1]
        model = re.search(r"Requested car: \S+(?: \S+)? (.+?) \(model year", prompt).group(1).split(" (")[0]
        get = lambda pat, grp=1: (re.search(pat, text) or [None, None])[grp]  # noqa: E731
        fields = {}
        price = get(r"Rs\. ([\d.]+) Lakh")
        if price:
            fields["price"] = {"value": round(float(price) * 100000), "quote": f"Rs. {price} Lakh"}
        hp = get(r"([\d.]+) bhp of power")
        if hp:
            fields["horsepower"] = {"value": float(hp), "unit": "bhp", "quote": f"{hp} bhp of power"}
            if any(f in model for f in fabricate_for):
                fields["horsepower"]["quote"] = "a quote that does not exist in the page"
        tq = get(r"([\d.]+) Nm of torque")
        if tq:
            fields["torque"] = {"value": float(tq), "unit": "nm", "quote": f"{tq} Nm of torque"}
        mil = re.search(r"Certified (?:mileage|range) is ([\d.]+) (kmpl|km)", text)
        if mil:
            fields["mileage"] = {"value": float(mil.group(1)), "unit": mil.group(2), "quote": mil.group(0)[10:]}
        eng = get(r"engine is a (.+? petrol) engine")
        if eng:
            fields["engine"] = {"value": "1197 cc petrol", "quote": f"{eng} engine"} if False else {"value": eng, "quote": f"engine is a {eng}"}
            fields["fuel_type"] = {"value": "petrol", "quote": f"{eng} engine"}
        if "fully electric" in text:
            fields["fuel_type"] = {"value": "electric", "quote": "fully electric vehicle"}
        seats = get(r"Seating capacity is (\d)")
        if seats:
            fields["seating_capacity"] = {"value": int(seats), "quote": f"Seating capacity is {seats}"}
        cat = get(r"is a (hatchback|sedan|SUV)\.")
        if cat:
            fields["category"] = {"value": cat.lower(), "quote": f"is a {cat}"}
        return httpx.Response(200, json={"message": {"role": "assistant", "content": json.dumps({"fields": fields, "specifications": {}})}})

    return httpx.MockTransport(handler), calls


MONGO_URI = os.getenv("MONGO_URI") or load_settings().mongo_uri


@unittest.skipUnless(MONGO_URI, "MONGO_URI not configured")
class PipelineIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from ingestion.store import Store
        self.settings = replace(load_settings(), mongo_uri=MONGO_URI, mongo_db="speedhype_pipeline_test",
                                tavily_api_key="t", ollama_model="test-model", shared_secret="s", http_retries=1)
        self.store = Store(self.settings)
        await self.store._run(self.store.client.drop_database, "speedhype_pipeline_test")
        await self.store.ensure_indexes()

    async def asyncTearDown(self):
        await self.store._run(self.store.client.drop_database, "speedhype_pipeline_test")
        self.store.client.close()

    async def run_pipeline(self, count, **transport_kwargs):
        from ingestion.api import execute_run
        transport, calls = make_transport(**transport_kwargs)
        run_id = await self.store.create_run(count, "user_test_admin")
        status = await execute_run(self.settings, self.store, run_id, count, transport=transport)
        from bson import ObjectId
        run = await self.store._run(self.store.runs.find_one, {"_id": ObjectId(run_id)})
        return status, run, calls

    async def test_five_car_batch_goes_to_pending_with_audit_trail(self):
        status, run, calls = await self.run_pipeline(5, fabricate_for=("Nexon",))
        self.assertEqual(status, "completed")
        self.assertEqual(run["counts"]["pendingReview"], 5)
        cars = {c["model"]: c for c in await self.store._run(lambda: list(self.store.cars.find()))}
        self.assertEqual(set(cars), {"Swift", "Creta", "Nexon", "City", "Punch EV"})
        for car in cars.values():                       # nothing is public until approved
            self.assertEqual(car["reviewStatus"], "pending")
            self.assertEqual(car["ingestedBy"], "speedhype-agent")
            self.assertTrue(car["sources"])
        swift, creta, nexon, city, ev = (cars[m] for m in ("Swift", "Creta", "Nexon", "City", "Punch EV"))
        self.assertEqual(swift["validation"]["fieldStatus"]["horsepower"], "cross_checked")
        self.assertEqual(swift["priceAmount"], 700000)
        self.assertIsNone(creta["priceAmount"])          # conflicting prices -> null + error
        self.assertEqual(creta["validation"]["recommendation"], "needs_attention")
        self.assertIsNone(nexon["horsepower"])           # fabricated quote -> null, never invented
        self.assertTrue(any(i["code"] == "no_primary_source" for i in city["validation"]["issues"]))
        self.assertEqual(ev["category"], "suv")
        self.assertEqual(ev["fuelType"], "electric")
        self.assertEqual(ev["mileageUnit"], "km")
        self.assertEqual(len(ev["images"]), 1)           # untrusted image host dropped
        self.assertEqual(ev["images"][0]["permissionStatus"], "unverified")
        self.assertLessEqual(calls["tavily"], 8)
        self.assertEqual(run["usage"]["llmCalls"], calls["llm"])
        usage = await self.store.usage_totals()
        self.assertEqual(usage["llmToday"], calls["llm"])

    async def test_rerun_is_idempotent_and_never_overwrites_reviewed_records(self):
        await self.run_pipeline(2)
        swift = await self.store._run(self.store.cars.find_one, {"model": "Swift"})
        await self.store._run(self.store.cars.update_one, {"_id": swift["_id"]}, {"$set": {"reviewStatus": "approved", "priceAmount": 1}})
        status, run, _ = await self.run_pipeline(2)      # same first two targets are skipped -> 2 fresh ones
        self.assertEqual(await self.store._run(self.store.cars.count_documents, {}), 4)
        self.assertEqual((await self.store._run(self.store.cars.find_one, {"_id": swift["_id"]}))["priceAmount"], 1)
        # direct upsert of an already-approved identity is refused, not duplicated
        record = {k: swift[k] for k in ("identityKey", "brand", "model")}
        outcome, _ = await self.store.upsert_pending_car(record)
        self.assertEqual(outcome, "exists_reviewed")
        self.assertEqual(await self.store._run(self.store.cars.count_documents, {"identityKey": swift["identityKey"]}), 1)

    async def test_ollama_failure_stores_nothing_and_reports_errors(self):
        status, run, _ = await self.run_pipeline(3, llm_status=500)
        self.assertEqual(status, "completed_with_errors")
        self.assertTrue(any("Ollama" in e for e in run["errors"]))
        self.assertEqual(await self.store._run(self.store.cars.count_documents, {}), 0)  # never invent data

    async def test_retry_replaces_pending_record_without_duplicating(self):
        from ingestion.api import execute_run
        from bson import ObjectId
        await self.run_pipeline(1)
        swift = await self.store._run(self.store.cars.find_one, {"model": "Swift"})
        transport, _ = make_transport()
        run_id = await self.store.create_run(1, "u")
        target = {"brand": swift["brand"], "model": swift["model"], "year": swift["launchYear"]}
        await execute_run(self.settings, self.store, run_id, 1, transport=transport,
                          targets=[target], retry_of=str(swift["_id"]))
        self.assertEqual(await self.store._run(self.store.cars.count_documents, {"model": "Swift"}), 1)
        self.assertEqual((await self.store._run(self.store.cars.find_one, {"_id": ObjectId(swift["_id"])}))["reviewStatus"], "pending")


class ApiSecurityTests(unittest.TestCase):
    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from ingestion import api
        os.environ["CAR_INGESTION_SHARED_SECRET"] = "unit-test-secret"
        app = FastAPI()
        app.include_router(api.router)
        self.client = TestClient(app)

    def test_requires_shared_secret(self):
        self.assertEqual(self.client.post("/ingest", json={"count": 5, "requestedBy": "u"}).status_code, 401)
        self.assertEqual(self.client.post("/ingest", json={"count": 5, "requestedBy": "u"}, headers={"Authorization": "Bearer wrong"}).status_code, 401)
        self.assertEqual(self.client.get("/ingest/status").status_code, 401)

    def test_validates_count(self):
        headers = {"Authorization": "Bearer unit-test-secret"}
        self.assertEqual(self.client.post("/ingest", json={"count": 0, "requestedBy": "u"}, headers=headers).status_code, 422)
        self.assertEqual(self.client.post("/ingest", json={"count": 1000, "requestedBy": "u"}, headers=headers).status_code, 422)


if __name__ == "__main__":
    unittest.main()
