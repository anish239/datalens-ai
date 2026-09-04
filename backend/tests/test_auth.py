import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected():
    """Unauthenticated requests to protected endpoints must return 401 UNAUTHENTICATED."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/datasets")
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "UNAUTHENTICATED"


@pytest.mark.asyncio
async def test_invalid_token_format_rejected():
    """Invalid authorization format (not 'Bearer <token>') must return 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/datasets", headers={"Authorization": "Basic bad_format"}
        )
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "UNAUTHENTICATED"


@pytest.mark.asyncio
async def test_valid_token_authenticated(auth_headers_user_a):
    """Valid Bearer token grants access to protected endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/datasets", headers=auth_headers_user_a)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
