import re

import httpx
from fastapi import APIRouter, HTTPException, Request, Response

from app.shared.config import get_settings

router = APIRouter(prefix="/_AMapService", tags=["amap"])

_AMAP_REST_ORIGIN = "https://restapi.amap.com"
_AMAP_WEB_ORIGIN = "https://webapi.amap.com"
_SAFE_SERVICE_PATH = re.compile(r"^[A-Za-z0-9._~/-]+$")


def amap_target_url(service_path: str) -> str:
    normalized_path = service_path.strip("/")
    if (
        not normalized_path
        or not _SAFE_SERVICE_PATH.fullmatch(normalized_path)
        or ".." in normalized_path.split("/")
    ):
        raise ValueError("invalid AMap service path")
    origin = _AMAP_WEB_ORIGIN if normalized_path.startswith("v4/map/styles") else _AMAP_REST_ORIGIN
    return f"{origin}/{normalized_path}"


async def request_amap_service(
    service_path: str,
    query_items: list[tuple[str, str]],
    security_js_code: str,
    *,
    client: httpx.AsyncClient,
) -> httpx.Response:
    params: list[tuple[str, str | int | float | bool | None]] = [
        (key, value) for key, value in query_items if key.lower() != "jscode"
    ]
    params.append(("jscode", security_js_code))
    return await client.get(amap_target_url(service_path), params=httpx.QueryParams(params))


@router.get("/{service_path:path}")
async def amap_service_proxy(service_path: str, request: Request) -> Response:
    settings = get_settings()
    security_js_code = settings.amap_security_js_code.get_secret_value().strip()
    if not security_js_code:
        raise HTTPException(status_code=503, detail="高德地图安全代理尚未配置")

    normalized_path = service_path.strip("/")
    try:
        amap_target_url(normalized_path)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="无效的高德地图服务路径") from error

    try:
        async with httpx.AsyncClient(
            timeout=settings.amap_proxy_timeout_seconds,
            follow_redirects=False,
        ) as client:
            upstream = await request_amap_service(
                normalized_path,
                list(request.query_params.multi_items()),
                security_js_code,
                client=client,
            )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="高德地图服务暂时不可用") from error

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() in {"content-type", "cache-control", "expires"}
    }
    return Response(content=upstream.content, status_code=upstream.status_code, headers=response_headers)
