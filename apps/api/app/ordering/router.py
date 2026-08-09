import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog.models import InventoryLog, Product, Variant
from app.identity.dependencies import current_customer
from app.identity.models import Customer
from app.shared.database import get_db

from .models import Order, OrderStatusLog
from .schemas import OrderCreate, OrderOut
from .service import order_payload

router = APIRouter(prefix="/orders", tags=["orders"])


def new_order_number() -> str:
    return f"XX-{datetime.now():%Y%m%d}-{secrets.token_hex(3).upper()}"


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(
    payload: OrderCreate,
    customer: Customer = Depends(current_customer),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(select(Order).where(Order.idempotency_key == payload.idempotency_key))
    if existing:
        if existing.customer_id != customer.id:
            raise HTTPException(status_code=409, detail="重复请求冲突")
        return order_payload(existing)

    row = (
        await db.execute(
            select(Variant, Product)
            .join(Product, Variant.product_id == Product.id)
            .where(Variant.id == payload.variant_id, Variant.active.is_(True), Product.status == "PUBLISHED")
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="商品规格不存在或不可购买")
    variant, product = row

    before_reserved = variant.reserved_stock
    reserved = await db.execute(
        update(Variant)
        .where(
            Variant.id == variant.id,
            Variant.active.is_(True),
            Variant.total_stock - Variant.reserved_stock >= payload.quantity,
        )
        .values(reserved_stock=Variant.reserved_stock + payload.quantity)
    )
    if reserved.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=409, detail="可售库存不足")

    order = Order(
        number=new_order_number(),
        idempotency_key=payload.idempotency_key,
        customer_id=customer.id,
        variant_id=variant.id,
        product_name=product.name,
        product_code=product.code,
        variant_name=variant.name,
        reference_unit_cents=variant.price_cents,
        quantity=payload.quantity,
        contact_phone=payload.contact_phone,
        wechat_id=payload.wechat_id,
        customer_note=payload.note,
    )
    db.add(order)
    await db.flush()
    db.add(OrderStatusLog(order_id=order.id, from_status=None, to_status=order.status, source="customer"))
    db.add(
        InventoryLog(
            variant_id=variant.id,
            order_id=order.id,
            change_type="RESERVED",
            reason=f"订单 {order.number} 创建",
            source="customer",
            total_before=variant.total_stock,
            reserved_before=before_reserved,
            total_after=variant.total_stock,
            reserved_after=before_reserved + payload.quantity,
        )
    )
    await db.commit()
    await db.refresh(order)
    return order_payload(order)


@router.get("", response_model=list[OrderOut])
async def list_orders(customer: Customer = Depends(current_customer), db: AsyncSession = Depends(get_db)):
    orders = list(
        (
            await db.scalars(
                select(Order).where(Order.customer_id == customer.id).order_by(Order.created_at.desc())
            )
        ).all()
    )
    return [order_payload(order) for order in orders]


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: int,
    customer: Customer = Depends(current_customer),
    db: AsyncSession = Depends(get_db),
):
    order = await db.scalar(select(Order).where(Order.id == order_id, Order.customer_id == customer.id))
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status != "PENDING_CONFIRMATION":
        raise HTTPException(status_code=409, detail="该订单需要联系管理员处理")
    variant = await db.get(Variant, order.variant_id)
    if not variant or variant.reserved_stock < order.quantity:
        raise HTTPException(status_code=409, detail="订单库存预留记录异常")
    before_total = variant.total_stock
    before_reserved = variant.reserved_stock

    changed = await db.execute(
        update(Order)
        .where(Order.id == order.id, Order.status == "PENDING_CONFIRMATION")
        .values(status="CANCELED")
    )
    if changed.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=409, detail="订单状态已经变化")
    await db.execute(
        update(Variant)
        .where(Variant.id == order.variant_id)
        .values(reserved_stock=Variant.reserved_stock - order.quantity)
    )
    db.add(
        OrderStatusLog(
            order_id=order.id, from_status="PENDING_CONFIRMATION", to_status="CANCELED", source="customer"
        )
    )
    db.add(
        InventoryLog(
            variant_id=order.variant_id,
            order_id=order.id,
            change_type="RELEASED",
            reason=f"客户取消订单 {order.number}",
            source="customer",
            total_before=before_total,
            reserved_before=before_reserved,
            total_after=before_total,
            reserved_after=before_reserved - order.quantity,
        )
    )
    await db.commit()
    await db.refresh(order)
    return order_payload(order)
