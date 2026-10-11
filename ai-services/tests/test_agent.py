import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from agent.main import (
    app,
    category_has_explicit_evidence,
    discover_missing_sources,
    fetch_allowed_page,
    has_safe_source_url,
    policy_is_configured,
    reconcile_candidates,
    validate_candidates,
    value_has_evidence,
)


class IngestionValidationTests(unittest.TestCase):
    def test_numeric_evidence_accepts_equivalent_decimal_and_rejects_mismatch(self):
        evidence = {"horsepower": "110 bhp"}
        self.assertTrue(value_has_evidence("horsepower", 110.0, evidence, "Published output: 110 bhp"))
        self.assertFalse(value_has_evidence("horsepower", 111.0, evidence, "Published output: 110 bhp"))

    def test_category_requires_one_unambiguous_explicit_classification(self):
        self.assertTrue(category_has_explicit_evidence("suv", "Compact SUV", "The source calls it a compact SUV."))
        self.assertFalse(category_has_explicit_evidence("electric", "Hybrid electric SUV", "Hybrid electric SUV"))
        self.assertFalse(category_has_explicit_evidence("muv", "MUV", "MUV vehicle"))

    def test_unsupported_optional_values_are_not_persisted(self):
        page = {
            "text": "Tata Example Sport 2025 hatchback. Published output is 110 bhp.",
            "title": "Example Sport | Tata Motors",
            "url": "https://cars.example.test/model",
            "source_name": "Manufacturer",
            "license": "Reviewed terms",
        }
        candidate = {
            "page": page,
            "extracted": {
                "brand": "Tata",
                "model": "Example",
                "variant": "Sport",
                "launch_year": 2025,
                "category": "hatchback",
                "horsepower": 110.0,
                "torque": 200.0,
                "fuel_type": "Petrol",
                "price_amount": 1200000,
                "price_currency": "INR",
                "evidence": {
                    "brand": "Tata",
                    "model": "Example",
                    "launch_year": "2025",
                    "category": "hatchback",
                    "horsepower": "110 bhp",
                    "variant": "Sport",
                    "torque": "200 Nm",
                },
            },
        }
        validated = validate_candidates({"candidates": [candidate]})["valid_records"]
        record = reconcile_candidates({"valid_records": validated})["reconciled_records"][0]
        self.assertEqual(record["variant"], "Sport")
        self.assertEqual(record["horsepower"], 110.0)
        self.assertNotIn("torque", record)
        self.assertNotIn("fuelType", record)
        self.assertNotIn("priceAmount", record)
        self.assertEqual(record["sourceTitle"], "Example Sport | Tata Motors")
        self.assertEqual(record["launchYear"], 2025)
        self.assertEqual(record["fieldSources"]["launchYear"]["quote"], "2025")

    def test_reconciles_missing_fields_from_matching_official_pages(self):
        pages = [
            {
                "text": "Tata Example 2025 hatchback.",
                "title": "Tata Example",
                "url": "https://cars.example.test/model",
                "source_name": "Manufacturer",
                "license": "Reviewed terms",
            },
            {
                "text": "Tata Example 2025 hatchback. Torque: 170 Nm.",
                "title": "Tata Example specifications",
                "url": "https://cars.example.test/specs",
                "source_name": "Manufacturer",
                "license": "Reviewed terms",
            },
        ]
        candidates = [
            {
                "page": page,
                "extracted": {
                    "brand": "Tata",
                    "model": "Example",
                    "launch_year": 2025,
                    "category": "hatchback",
                    "torque": 170 if index else None,
                    "evidence": {
                        "brand": "Tata",
                        "model": "Example",
                        "launch_year": "2025",
                        "category": "hatchback",
                        **({"torque": "Torque: 170 Nm"} if index else {}),
                    },
                },
            }
            for index, page in enumerate(pages)
        ]
        validated = validate_candidates({"candidates": candidates})["valid_records"]
        record = reconcile_candidates({"valid_records": validated})["reconciled_records"][0]
        self.assertEqual(record["torque"], 170)
        self.assertEqual(record["fieldSources"]["torque"]["sourceTitle"], "Tata Example specifications")
        self.assertEqual(record["fieldSources"]["torque"]["quote"], "Torque: 170 Nm")

    def test_conflicting_source_values_are_not_selected(self):
        candidates = []
        for horsepower, page_title in ((110, "Source one"), (120, "Source two")):
            page = {
                "text": f"Tata Example 2025 hatchback. Power {horsepower} hp.",
                "title": page_title,
                "url": f"https://cars.example.test/{horsepower}",
                "source_name": "Manufacturer",
                "license": "Reviewed terms",
            }
            candidates.append({
                "page": page,
                "extracted": {
                    "brand": "Tata",
                    "model": "Example",
                    "launch_year": 2025,
                    "category": "hatchback",
                    "horsepower": horsepower,
                    "evidence": {
                        "brand": "Tata",
                        "model": "Example",
                        "launch_year": "2025",
                        "category": "hatchback",
                        "horsepower": f"Power {horsepower} hp.",
                    },
                },
            })
        validated = validate_candidates({"candidates": candidates})["valid_records"]
        record = reconcile_candidates({"valid_records": validated})["reconciled_records"][0]
        self.assertNotIn("horsepower", record)
        self.assertNotIn("horsepower", record["fieldSources"])

    def test_variant_is_not_filled_with_an_assumed_base_value(self):
        page = {
            "text": "Tata Example 2025 hatchback.",
            "title": "Tata Example",
            "url": "https://cars.example.test/model",
            "source_name": "Manufacturer",
            "license": "Reviewed terms",
        }
        candidate = {
            "page": page,
            "extracted": {
                "brand": "Tata",
                "model": "Example",
                "launch_year": 2025,
                "category": "hatchback",
                "evidence": {
                    "brand": "Tata",
                    "model": "Example",
                    "launch_year": "2025",
                    "category": "hatchback",
                },
            },
        }
        validated = validate_candidates({"candidates": [candidate]})["valid_records"]
        record = reconcile_candidates({"valid_records": validated})["reconciled_records"][0]
        self.assertEqual(record["variant"], "")

    def test_source_url_requires_https_approved_host_without_query_secrets(self):
        self.assertTrue(has_safe_source_url("https://cars.example.test/models/hatchback"))
        self.assertFalse(has_safe_source_url("http://cars.example.test/models/hatchback"))
        self.assertFalse(has_safe_source_url("https://cars.example.test/models?api_key=secret"))
        self.assertFalse(has_safe_source_url("https://cars.example.test/models?client_secret=secret"))

    def test_control_api_requires_internal_bearer_secret(self):
        with patch.dict(os.environ, {
            "CAR_INGESTION_SHARED_SECRET": "test-only-secret",
            "CAR_SOURCE_URLS": "[]",
            "SOURCE_POLICY_APPROVED": "false",
        }):
            with TestClient(app) as client:
                unauthorized = client.get("/status", headers={"Authorization": "Bearer incorrect"})
                status = client.get("/status", headers={"Authorization": "Bearer test-only-secret"})
        self.assertEqual(unauthorized.status_code, 401)
        self.assertEqual(status.status_code, 200)
        self.assertFalse(status.json()["configured"])

    def test_listing_source_requires_a_product_link_pattern(self):
        source = {
            "url": "https://cars.example.test/models",
            "source_name": "Manufacturer",
            "license": "Reviewed terms",
            "terms_reviewed": True,
            "category": "suv",
            "page_type": "listing",
        }
        with patch.dict(os.environ, {
            "SOURCE_POLICY_APPROVED": "true",
            "CAR_SOURCE_ALLOWED_DOMAINS": "cars.example.test",
            "CAR_SOURCE_URLS": json.dumps([source]),
        }):
            self.assertFalse(policy_is_configured())
            source["product_link_pattern"] = r"/models/[a-z0-9-]+"
            os.environ["CAR_SOURCE_URLS"] = json.dumps([source])
            self.assertTrue(policy_is_configured())

    def test_configured_search_template_must_remain_on_allowlisted_host(self):
        source = {
            "url": "https://cars.example.test/models",
            "source_name": "Manufacturer",
            "license": "Reviewed terms",
            "terms_reviewed": True,
            "search_url_template": "https://other.example.test/search?q={query}",
            "product_link_pattern": r"/models/[a-z0-9-]+",
        }
        with patch.dict(os.environ, {
            "SOURCE_POLICY_APPROVED": "true",
            "CAR_SOURCE_ALLOWED_DOMAINS": "cars.example.test",
            "CAR_SOURCE_URLS": json.dumps([source]),
        }):
            self.assertFalse(policy_is_configured())


class SourceFetchTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_fields_search_only_configured_host_results(self):
        requested = []

        def handler(request):
            requested.append(str(request.url))
            if request.url.path == "/robots.txt":
                return httpx.Response(200, text="User-agent: *\nAllow: /\n")
            if request.url.path == "/search":
                return httpx.Response(
                    200,
                    text='<html><a href="/vehicles/example">Tata Example</a></html>',
                )
            if request.url.path == "/vehicles/example":
                return httpx.Response(
                    200,
                    text="<html><title>Tata Example Specs</title><body>Tata Example 2025 hatchback. Torque 170 Nm.</body></html>",
                )
            return httpx.Response(404)

        source = {
            "url": "https://cars.example.test/models",
            "search_url_template": "https://cars.example.test/search?q={query}",
            "product_link_pattern": r"/vehicles/[a-z-]+",
            "source_name": "Manufacturer",
            "license": "Reviewed terms",
            "terms_reviewed": True,
        }
        candidate_page = {
            "url": "https://cars.example.test/models",
            "text": "Tata Example 2025 hatchback.",
            "title": "Tata Example",
        }
        state = {
            "sources": [source],
            "pages": [candidate_page],
            "candidates": [{
                "page": candidate_page,
                "extracted": {
                    "brand": "Tata",
                    "model": "Example",
                    "launch_year": 2025,
                    "evidence": {},
                },
            }],
        }
        real_async_client = httpx.AsyncClient
        with patch.dict(os.environ, {"CAR_SOURCE_ALLOWED_DOMAINS": "cars.example.test"}):
            with patch(
                "agent.main.httpx.AsyncClient",
                side_effect=lambda **kwargs: real_async_client(
                    transport=httpx.MockTransport(handler),
                    **kwargs,
                ),
            ):
                result = await discover_missing_sources(state)
        self.assertEqual(len(result["discovered_pages"]), 1)
        self.assertEqual(result["discovered_pages"][0]["title"], "Tata Example Specs")
        self.assertTrue(any("/search?q=Tata+Example+2025" in url for url in requested))
        self.assertTrue(any("/vehicles/example" in url for url in requested))

    async def test_listing_fetch_keeps_only_same_host_product_links(self):
        def handler(request):
            if request.url.path == "/robots.txt":
                return httpx.Response(200, text="User-agent: *\nAllow: /\n")
            return httpx.Response(
                200,
                text=(
                    '<html><body><h1>Models</h1>'
                    '<a href="/models/car-one">Car one</a>'
                    '<a href="https://other.example.test/model">External</a>'
                    "</body></html>"
                ),
            )

        source = {
            "url": "https://cars.example.test/models",
            "source_name": "Manufacturer",
            "license": "Reviewed terms",
            "terms_reviewed": True,
        }
        with patch.dict(os.environ, {"CAR_SOURCE_ALLOWED_DOMAINS": "cars.example.test"}):
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
                result = await fetch_allowed_page(client, source)
        self.assertEqual(result["links"], ["https://cars.example.test/models/car-one"])

    async def test_disallowed_robots_path_is_not_fetched(self):
        requested_paths = []

        def handler(request):
            requested_paths.append(request.url.path)
            if request.url.path == "/robots.txt":
                return httpx.Response(200, text="User-agent: *\nDisallow: /blocked\n")
            return httpx.Response(200, text="<html><body>Should not be fetched</body></html>")

        source = {
            "url": "https://cars.example.test/blocked/model",
            "terms_reviewed": True,
        }
        with patch.dict(os.environ, {"CAR_SOURCE_ALLOWED_DOMAINS": "cars.example.test"}):
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
                with self.assertRaisesRegex(ValueError, "Robots policy disallows"):
                    await fetch_allowed_page(client, source)
        self.assertEqual(requested_paths, ["/robots.txt"])


if __name__ == "__main__":
    unittest.main()
