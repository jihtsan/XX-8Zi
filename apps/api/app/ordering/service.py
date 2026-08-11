from app.ordering.models import Order, OrderImageSnapshot
from app.shared.storage import media_url

STATUS_LABELS = {
    "PENDING_CONFIRMATION": "待确认",
    "CONFIRMED": "已确认",
    "COMPLETED": "已完成",
    "CANCELED": "已取消",
}


def order_payload(order: Order, snapshot: OrderImageSnapshot | None = None) -> dict:
    return {
        "id": order.id,
        "number": order.number,
        "product_name": order.product_name,
        "product_code": order.product_code,
        "product_image_url": media_url(snapshot.storage_key) if snapshot else None,
        "variant_name": order.variant_name,
        "quantity": order.quantity,
        "reference_unit": order.reference_unit_cents / 100,
        "reference_total": order.reference_unit_cents * order.quantity / 100,
        "contact_phone": order.contact_phone,
        "wechat_id": order.wechat_id,
        "note": order.customer_note,
        "status": order.status,
        "status_label": STATUS_LABELS[order.status],
        "created_at": order.created_at,
    }
