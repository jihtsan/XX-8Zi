import asyncio

import httpx
import pytest

from app.merchant_settings.amap_proxy import amap_target_url, request_amap_service


def test_amap_target_routes_style_requests_to_web_origin():
    assert amap_target_url("v4/map/styles") == "https://webapi.amap.com/v4/map/styles"
    assert amap_target_url("v3/place/text") == "https://restapi.amap.com/v3/place/text"


@pytest.mark.parametrize("service_path", ["", "../admin", "v3/place/<script>"])
def test_amap_target_rejects_invalid_paths(service_path: str):
    with pytest.raises(ValueError):
        amap_target_url(service_path)


def test_amap_proxy_appends_server_secret_and_replaces_client_jscode():
    captured: dict[str, str] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(200, json={"status": "1"})

    async def request() -> httpx.Response:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await request_amap_service(
                "v3/place/text",
                [("key", "public-key"), ("jscode", "untrusted")],
                "server-secret",
                client=client,
            )

    response = asyncio.run(request())
    assert response.status_code == 200
    assert "key=public-key" in captured["url"]
    assert "jscode=server-secret" in captured["url"]
    assert "untrusted" not in captured["url"]
