import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_user_a_cannot_access_user_b_dataset(
    auth_headers_user_a, auth_headers_user_b, sample_csv_content
):
    """User A cannot access or read a dataset owned by User B (enforces 403 FORBIDDEN)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # User B uploads a dataset
        files = {"file": ("user_b_dataset.csv", sample_csv_content, "text/csv")}
        upload_res = await client.post(
            "/api/datasets/upload",
            headers=auth_headers_user_b,
            files=files,
        )
        assert upload_res.status_code == 200
        dataset_id = upload_res.json()["dataset"]["datasetId"]

        # User A attempts to read User B's dataset
        get_res = await client.get(
            f"/api/datasets/{dataset_id}",
            headers=auth_headers_user_a,
        )
        assert get_res.status_code == 403
        assert get_res.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_user_a_cannot_delete_user_b_dataset(
    auth_headers_user_a, auth_headers_user_b, sample_csv_content
):
    """User A cannot delete a dataset owned by User B (enforces 403 FORBIDDEN)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # User B uploads a dataset
        files = {"file": ("user_b_data.csv", sample_csv_content, "text/csv")}
        upload_res = await client.post(
            "/api/datasets/upload",
            headers=auth_headers_user_b,
            files=files,
        )
        assert upload_res.status_code == 200
        dataset_id = upload_res.json()["dataset"]["datasetId"]

        # User A attempts to delete User B's dataset
        del_res = await client.delete(
            f"/api/datasets/{dataset_id}",
            headers=auth_headers_user_a,
        )
        assert del_res.status_code == 403
        assert del_res.json()["error"]["code"] == "FORBIDDEN"
