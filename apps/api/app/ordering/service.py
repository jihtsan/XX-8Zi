from app.ordering.models import Order

STATUS_LABELS = {
    "PENDING_CONFIRMATION": "待确认",
    "CONFIRMED": "已确认",
    "COMPLETED": "已完成",
    "CANCELED": "已取消",
}


def order_payload(order: Order) -> dict:
    return {
        "id": order.id,
        "number": order.number,
        "product_name": order.product_name,
        "product_code": order.product_code,
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
