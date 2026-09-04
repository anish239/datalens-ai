import io
import pytest
import pandas as pd
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_csv_upload_success(auth_headers_user_a, sample_csv_content):
    """Valid CSV upload successfully parses and profiles schema."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("sales_data.csv", sample_csv_content, "text/csv")}
        response = await client.post(
            "/api/datasets/upload",
            headers=auth_headers_user_a,
            files=files,
        )
        assert response.status_code == 200
        data = response.json()
        assert "dataset" in data
        ds = data["dataset"]
        assert ds["fileName"] == "sales_data.csv"
        assert ds["fileType"] == "csv"
        assert ds["rowCount"] == 8
        assert ds["columnCount"] == 6
        assert ds["ownerId"] == "user_a_123"
        assert len(ds["columns"]) == 6
        assert ds["dataQualityScore"] >= 80


@pytest.mark.asyncio
async def test_xlsx_upload_success(auth_headers_user_a):
    """Valid XLSX upload successfully parses and profiles schema."""
    df = pd.DataFrame({
        "employee_id": [1, 2, 3, 4],
        "department": ["Engineering", "Product", "Design", "Engineering"],
        "salary": [120000, 115000, 95000, 130000],
        "is_remote": [True, False, True, True],
    })
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    xlsx_content = output.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "employees.xlsx",
                xlsx_content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        response = await client.post(
            "/api/datasets/upload",
            headers=auth_headers_user_a,
            files=files,
        )
        assert response.status_code == 200
        data = response.json()
        ds = data["dataset"]
        assert ds["fileType"] == "xlsx"
        assert ds["rowCount"] == 4
        assert ds["columnCount"] == 4


@pytest.mark.asyncio
async def test_unsupported_file_extension_rejected(auth_headers_user_a):
    """Unsupported file types (e.g. .py, .pdf, .json, .exe) are rejected with 400 UNSUPPORTED_FILE_TYPE."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("malicious.py", b"import os; os.system('echo 1')", "text/x-python")}
        response = await client.post(
            "/api/datasets/upload",
            headers=auth_headers_user_a,
            files=files,
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


@pytest.mark.asyncio
async def test_empty_dataset_rejected(auth_headers_user_a, empty_csv_content):
    """Empty 0-byte dataset upload is rejected with 400 EMPTY_DATASET."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("empty.csv", empty_csv_content, "text/csv")}
        response = await client.post(
            "/api/datasets/upload",
            headers=auth_headers_user_a,
            files=files,
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "EMPTY_DATASET"


@pytest.mark.asyncio
async def test_malformed_xlsx_rejected(auth_headers_user_a):
    """Corrupted / malformed XLSX is rejected with 400 INVALID_XLSX."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "corrupted.xlsx",
                b"PK\x03\x04NOT_A_VALID_EXCEL_ZIP_PAYLOAD",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        response = await client.post(
            "/api/datasets/upload",
            headers=auth_headers_user_a,
            files=files,
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INVALID_XLSX"
