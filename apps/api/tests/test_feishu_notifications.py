import asyncio
import json

import httpx

from app.ordering.notifications import (
    OrderNotification,
    customer_canceled_order_card,
    feishu_card_payload,
    generate_feishu_signature,
    new_order_card,
    send_feishu_card,
)
from app.shared.config import get_settings


def order_notification() -> OrderNotification:
    return OrderNotification(
        number="XX-20260816-ABC123",
        product_name="紫晶星轨",
        variant_name="紫水晶 / 8mm / 16cm",
        quantity=2,
        reference_total_cents=39800,
        contact_phone="13800138000",
    )


def test_feishu_signature_and_card_payload_match_expected_format():
    timestamp = "1599360473"
    secret = "test-secret"
    card = new_order_card(order_notification())

    assert generate_feishu_signature(timestamp, secret) == "wSds2BzzFIIGf/WrhUO+NI1q/9j+FRJd3JNHKAq0NZY="
    assert feishu_card_payload(card, secret, timestamp) == {
        "timestamp": timestamp,
        "sign": "wSds2BzzFIIGf/WrhUO+NI1q/9j+FRJd3JNHKAq0NZY=",
        "msg_type": "interactive",
        "card": card,
    }


def test_new_order_card_uses_visual_hierarchy_and_masks_customer_phone():
    card = new_order_card(order_notification())

    assert card["header"] == {
        "template": "purple",
        "title": {"tag": "plain_text", "content": "玄序订单通知 · 新订单待确认"},
    }
    serialized = json.dumps(card, ensure_ascii=False)
    assert "参考金额" in serialized
    assert "¥398.00" in serialized
    assert "138••••8000" in serialized
    assert "13800138000" not in serialized


def test_customer_canceled_card_has_distinct_status_and_guidance():
    card = customer_canceled_order_card(order_notification())

    assert card["header"] == {
        "template": "grey",
        "title": {"tag": "plain_text", "content": "玄序订单通知 · 客户已取消订单"},
    }
    serialized = json.dumps(card, ensure_ascii=False)
    assert "已取消" in serialized
    assert "库存预留已释放" in serialized


def test_send_feishu_card_posts_signed_message(monkeypatch):
    monkeypatch.setenv("FEISHU_WEBHOOK_URL", "https://open.feishu.cn/open-apis/bot/v2/hook/test")
    monkeypatch.setenv("FEISHU_WEBHOOK_SECRET", "test-secret")
    get_settings.cache_clear()
    captured: dict[str, object] = {}
    card = new_order_card(order_notification())

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["payload"] = json.loads(request.content)
        return httpx.Response(200, json={"code": 0, "msg": "success"})

    async def send() -> bool:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await send_feishu_card(card, client)

    try:
        assert asyncio.run(send()) is True
    finally:
        get_settings.cache_clear()

    assert captured["url"] == "https://open.feishu.cn/open-apis/bot/v2/hook/test"
    payload = captured["payload"]
    assert isinstance(payload, dict)
    assert payload["msg_type"] == "interactive"
    assert payload["card"] == card
    assert isinstance(payload["timestamp"], str)
    assert isinstance(payload["sign"], str)


def test_send_feishu_card_contains_transport_failures(monkeypatch):
    monkeypatch.setenv("FEISHU_WEBHOOK_URL", "https://open.feishu.cn/open-apis/bot/v2/hook/test")
    get_settings.cache_clear()

    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection failed", request=request)

    async def send() -> bool:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await send_feishu_card(new_order_card(order_notification()), client)

    try:
        assert asyncio.run(send()) is False
    finally:
        get_settings.cache_clear()
