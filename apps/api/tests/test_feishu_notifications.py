import asyncio
import json

import httpx

from app.ordering.notifications import (
    NewOrderNotification,
    feishu_text_payload,
    generate_feishu_signature,
    new_order_message,
    send_feishu_text,
)
from app.shared.config import get_settings


def test_feishu_signature_and_payload_match_expected_format():
    timestamp = "1599360473"
    secret = "test-secret"

    assert generate_feishu_signature(timestamp, secret) == "wSds2BzzFIIGf/WrhUO+NI1q/9j+FRJd3JNHKAq0NZY="
    assert feishu_text_payload("测试消息", secret, timestamp) == {
        "timestamp": timestamp,
        "sign": "wSds2BzzFIIGf/WrhUO+NI1q/9j+FRJd3JNHKAq0NZY=",
        "msg_type": "text",
        "content": {"text": "测试消息"},
    }


def test_new_order_message_masks_customer_phone():
    message = new_order_message(
        NewOrderNotification(
            number="XX-20260816-ABC123",
            product_name="紫晶星轨",
            variant_name="紫水晶 / 8mm / 16cm",
            quantity=2,
            reference_total_cents=39800,
            contact_phone="13800138000",
        )
    )

    assert "玄序订单通知" in message
    assert "参考金额：¥398.00" in message
    assert "138****8000" in message
    assert "13800138000" not in message


def test_send_feishu_text_posts_signed_message(monkeypatch):
    monkeypatch.setenv("FEISHU_WEBHOOK_URL", "https://open.feishu.cn/open-apis/bot/v2/hook/test")
    monkeypatch.setenv("FEISHU_WEBHOOK_SECRET", "test-secret")
    get_settings.cache_clear()
    captured: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["payload"] = json.loads(request.content)
        return httpx.Response(200, json={"code": 0, "msg": "success"})

    async def send() -> bool:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await send_feishu_text("订单通知", client)

    try:
        assert asyncio.run(send()) is True
    finally:
        get_settings.cache_clear()

    assert captured["url"] == "https://open.feishu.cn/open-apis/bot/v2/hook/test"
    payload = captured["payload"]
    assert isinstance(payload, dict)
    assert payload["msg_type"] == "text"
    assert payload["content"] == {"text": "订单通知"}
    assert isinstance(payload["timestamp"], str)
    assert isinstance(payload["sign"], str)


def test_send_feishu_text_contains_transport_failures(monkeypatch):
    monkeypatch.setenv("FEISHU_WEBHOOK_URL", "https://open.feishu.cn/open-apis/bot/v2/hook/test")
    get_settings.cache_clear()

    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection failed", request=request)

    async def send() -> bool:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await send_feishu_text("订单通知", client)

    try:
        assert asyncio.run(send()) is False
    finally:
        get_settings.cache_clear()
