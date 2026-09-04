import io
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.services.analytics import AnalyticsEngine


@pytest.mark.asyncio
async def test_analytics_endpoints_require_authentication():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/datasets/ds_123/analytics/overview")
        assert res.status_code == 401

        res = await client.post("/api/datasets/ds_123/analytics/group-by", json={})
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_tool_registry_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/analytics/registry")
        assert res.status_code == 200
        data = res.json()
        assert data["totalTools"] >= 8
        assert any(t["toolName"] == "calculate_correlation" for t in data["tools"])


@pytest.mark.asyncio
async def test_analytics_full_flow_with_ownership(auth_headers_user_a, auth_headers_user_b, sample_csv_content):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. User A uploads dataset
        files = {"file": ("sales_data.csv", io.BytesIO(sample_csv_content), "text/csv")}
        upload_res = await client.post("/api/datasets/upload", files=files, headers=auth_headers_user_a)
        assert upload_res.status_code == 200
        dataset_id = upload_res.json()["dataset"]["datasetId"]

        # 2. User A gets overview
        overview_res = await client.get(f"/api/datasets/{dataset_id}/analytics/overview", headers=auth_headers_user_a)
        assert overview_res.status_code == 200
        assert overview_res.json()["datasetId"] == dataset_id

        # 3. User A runs group-by
        group_by_payload = {
            "by": "category",
            "aggregations": [
                {"column": "selling_price", "function": "sum", "alias": "total_sales"},
                {"column": "selling_price", "function": "mean", "alias": "avg_price"},
            ],
            "sortBy": "total_sales",
            "ascending": False,
        }
        gb_res = await client.post(
            f"/api/datasets/{dataset_id}/analytics/group-by",
            json=group_by_payload,
            headers=auth_headers_user_a,
        )
        assert gb_res.status_code == 200
        gb_data = gb_res.json()["result"]
        assert gb_data["totalGroups"] > 0

        # 4. User B attempts to access User A's dataset analytics -> 403 FORBIDDEN
        cross_res = await client.get(
            f"/api/datasets/{dataset_id}/analytics/overview",
            headers=auth_headers_user_b,
        )
        assert cross_res.status_code == 403

        # 5. User A deletes dataset
        del_res = await client.delete(f"/api/datasets/{dataset_id}", headers=auth_headers_user_a)
        assert del_res.status_code == 200
