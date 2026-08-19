import base64
import hashlib
import hmac
import logging
import time
from dataclasses import dataclass

import httpx

from app.shared.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class OrderNotification:
    number: str
    product_name: str
    variant_name: str
    quantity: int
    reference_total_cents: int
    contact_phone: str


def generate_feishu_signature(timestamp: str, secret: str) -> str:
    string_to_sign = f"{timestamp}\n{secret}".encode()
    digest = hmac.new(string_to_sign, digestmod=hashlib.sha256).digest()
    return base64.b64encode(digest).decode()


def mask_phone(phone: str) -> str:
    if len(phone) >= 7:
        return f"{phone[:3]}••••{phone[-4:]}"
    return "*" * len(phone)


def _escape_markdown(value: str) -> str:
    for character in ("\\", "`", "*", "_", "~", "[", "]"):
        value = value.replace(character, f"\\{character}")
    return value


def _field(label: str, value: str, *, short: bool = True) -> dict[str, object]:
    return {
        "is_short": short,
        "text": {
            "tag": "lark_md",
            "content": f"**{label}**\n{_escape_markdown(value)}",
        },
    }


def _order_card(
    notification: OrderNotification,
    *,
    title: str,
    template: str,
    status_label: str,
    note: str,
) -> dict[str, object]:
    reference_total = notification.reference_total_cents / 100
    return {
        "config": {"wide_screen_mode": True},
        "header": {
            "template": template,
            "title": {"tag": "plain_text", "content": title},
        },
        "elements": [
            {
                "tag": "div",
                "fields": [
                    _field("订单号", notification.number),
                    _field("当前状态", status_label),
                    _field("商品", notification.product_name, short=False),
                    _field("规格", notification.variant_name, short=False),
                    _field("数量", str(notification.quantity)),
                    _field("参考金额", f"¥{reference_total:.2f}"),
                    _field("联系电话", mask_phone(notification.contact_phone)),
                ],
            },
            {"tag": "hr"},
            {
                "tag": "note",
                "elements": [{"tag": "plain_text", "content": note}],
            },
        ],
    }


def new_order_card(notification: OrderNotification) -> dict[str, object]:
    return _order_card(
        notification,
        title="玄序订单通知 · 新订单待确认",
        template="purple",
        status_label="待确认",
        note="请登录管理后台查看完整联系方式并及时处理。",
    )


def customer_canceled_order_card(notification: OrderNotification) -> dict[str, object]:
    return _order_card(
        notification,
        title="玄序订单通知 · 客户已取消订单",
        template="grey",
        status_label="已取消",
        note="客户已取消订单，相关库存预留已释放。",
    )


def feishu_card_payload(
    card: dict[str, object], secret: str, timestamp: str | None = None
) -> dict[str, object]:
    payload: dict[str, object] = {"msg_type": "interactive", "card": card}
    if secret:
        signed_at = timestamp or str(int(time.time()))
        payload.update(
            {
                "timestamp": signed_at,
                "sign": generate_feishu_signature(signed_at, secret),
            }
        )
    return payload


async def send_feishu_card(card: dict[str, object], client: httpx.AsyncClient | None = None) -> bool:
    settings = get_settings()
    webhook_url = settings.feishu_webhook_url.get_secret_value()
    if not webhook_url:
        logger.debug("飞书 Webhook 未配置，跳过订单通知")
        return False

    payload = feishu_card_payload(card, settings.feishu_webhook_secret.get_secret_value())
    owns_client = client is None
    request_client = client or httpx.AsyncClient(timeout=settings.feishu_webhook_timeout_seconds)
    try:
        response = await request_client.post(webhook_url, json=payload)
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict):
            logger.warning("飞书 Webhook 返回了无法识别的响应")
            return False
        if result.get("code", 0) != 0:
            logger.warning("飞书 Webhook 拒绝通知，错误码：%s", result.get("code"))
            return False
        return True
    except httpx.HTTPStatusError as error:
        logger.warning("发送飞书订单通知失败，HTTP 状态码：%s", error.response.status_code)
        return False
    except httpx.HTTPError as error:
        logger.warning("发送飞书订单通知失败，网络错误：%s", type(error).__name__)
        return False
    except ValueError:
        logger.warning("飞书 Webhook 返回了无效的 JSON 响应")
        return False
    finally:
        if owns_client:
            await request_client.aclose()


async def notify_new_order(notification: OrderNotification) -> bool:
    return await send_feishu_card(new_order_card(notification))


async def notify_customer_canceled_order(notification: OrderNotification) -> bool:
    return await send_feishu_card(customer_canceled_order_card(notification))
