from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog.models import Category, InventoryLog, Product, Variant
from app.identity.dependencies import current_admin
from app.identity.models import Admin, Customer, SessionRecord
from app.identity.router import set_session_cookie
from app.identity.schemas import AdminLogin
from app.merchant_settings.models import MerchantSettings
from app.ordering.models import Order, OrderStatusLog
from app.ordering.schemas import OrderStatusUpdate
from app.ordering.service import STATUS_LABELS
from app.shared.database import get_db
from app.shared.security import new_session_token, session_expiry, verify_password
from app.shared.time import utc_now

from .schemas import (
    CustomerStatusUpdate,
    InventoryUpdate,
    MerchantSettingsUpdate,
    ProductUpdate,
    VariantUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/auth/login")
async def admin_login(payload: AdminLogin, response: Response, db: AsyncSession = Depends(get_db)):
    admin = await db.scalar(select(Admin).where(Admin.username == payload.username))
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码不正确")
    token, digest = new_session_token()
    db.add(
        SessionRecord(token_hash=digest, actor_type="admin", actor_id=admin.id, expires_at=session_expiry())
    )
    admin.last_login_at = utc_now()
    await db.commit()
    set_session_cookie(response, "admin_session", token)
    return {"id": admin.id, "username": admin.username}


@router.post("/auth/logout")
async def admin_logout(response: Response):
    response.delete_cookie("admin_session", path="/")
    return {"ok": True}


@router.get("/dashboard")
async def dashboard(_admin: Admin = Depends(current_admin), db: AsyncSession = Depends(get_db)):
    products = await db.scalar(select(func.count()).select_from(Product)) or 0
    active_products = (
        await db.scalar(select(func.count()).select_from(Product).where(Product.status == "PUBLISHED")) or 0
    )
    pending_orders = (
        await db.scalar(select(func.count()).select_from(Order).where(Order.status == "PENDING_CONFIRMATION"))
        or 0
    )
    customers = await db.scalar(select(func.count()).select_from(Customer)) or 0
    latest = list((await db.scalars(select(Order).order_by(Order.created_at.desc()).limit(10))).all())
    return {
        "products": products,
        "active_products": active_products,
        "pending_orders": pending_orders,
        "customers": customers,
        "orders": [
            {
                "id": order.id,
                "number": order.number,
                "product_name": order.product_name,
                "contact_phone": order.contact_phone,
                "status": order.status,
                "status_label": STATUS_LABELS[order.status],
                "created_at": order.created_at,
            }
            for order in latest
        ],
    }


@router.get("/catalog")
async def admin_catalog(_admin: Admin = Depends(current_admin), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Product, Category)
            .join(Category, Product.category_id == Category.id)
            .order_by(Product.sort_order, Product.id)
        )
    ).all()
    result = []
    for product, category in rows:
        variants = list(
            (
                await db.scalars(select(Variant).where(Variant.product_id == product.id).order_by(Variant.id))
            ).all()
        )
        result.append(
            {
                "id": product.id,
                "code": product.code,
                "name": product.name,
                "category": category.name,
                "status": product.status,
                "sort_order": product.sort_order,
                "variants": [
                    {
                        "id": variant.id,
                        "code": variant.code,
                        "name": variant.name,
                        "price_cents": variant.price_cents,
                        "total_stock": variant.total_stock,
                        "reserved_stock": variant.reserved_stock,
                        "available_stock": variant.available_stock,
                        "active": variant.active,
                    }
                    for variant in variants
                ],
            }
        )
    return result


@router.patch("/products/{product_id}")
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    _admin: Admin = Depends(current_admin),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    values = payload.model_dump(exclude_none=True)
    if "status" in values and values["status"] not in {"DRAFT", "PUBLISHED", "UNPUBLISHED"}:
        raise HTTPException(status_code=422, detail="商品状态无效")
    for key, value in values.items():
        setattr(product, key, value)
    await db.commit()
    return {"ok": True, "id": product.id, "status": product.status}


@router.patch("/variants/{variant_id}")
async def update_variant(
    variant_id: int,
    payload: VariantUpdate,
    _admin: Admin = Depends(current_admin),
    db: AsyncSession = Depends(get_db),
):
    variant = await db.get(Variant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="商品规格不存在")
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(variant, key, value)
    await db.commit()
    return {"ok": True, "id": variant.id}


@router.post("/variants/{variant_id}/inventory")
async def update_inventory(
    variant_id: int,
    payload: InventoryUpdate,
    _admin: Admin = Depends(current_admin),
    db: AsyncSession = Depends(get_db),
):
    variant = await db.get(Variant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="商品规格不存在")
    if payload.total_stock < variant.reserved_stock:
        raise HTTPException(status_code=409, detail="库存总量不能低于已预留数量")
    before_total = variant.total_stock
    variant.total_stock = payload.total_stock
    db.add(
        InventoryLog(
            variant_id=variant.id,
            order_id=None,
            change_type="MANUAL_ADJUSTMENT",
            reason=payload.reason,
            source="admin",
            total_before=before_total,
            reserved_before=variant.reserved_stock,
            total_after=variant.total_stock,
            reserved_after=variant.reserved_stock,
        )
    )
    await db.commit()
    return {
        "ok": True,
        "total_stock": variant.total_stock,
        "reserved_stock": variant.reserved_stock,
        "available_stock": variant.available_stock,
    }


@router.get("/inventory/logs")
async def inventory_logs(_admin: Admin = Depends(current_admin), db: AsyncSession = Depends(get_db)):
    logs = list(
        (await db.scalars(select(InventoryLog).order_by(InventoryLog.created_at.desc()).limit(100))).all()
    )
    return [
        {
            "id": log.id,
            "variant_id": log.variant_id,
            "order_id": log.order_id,
            "change_type": log.change_type,
            "reason": log.reason,
            "source": log.source,
            "total_before": log.total_before,
            "reserved_before": log.reserved_before,
            "total_after": log.total_after,
            "reserved_after": log.reserved_after,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.get("/customers")
async def customers_list(_admin: Admin = Depends(current_admin), db: AsyncSession = Depends(get_db)):
    customers = list((await db.scalars(select(Customer).order_by(Customer.created_at.desc()))).all())
    return [
        {
            "id": customer.id,
            "phone": customer.phone,
            "active": customer.active,
            "created_at": customer.created_at,
            "last_login_at": customer.last_login_at,
        }
        for customer in customers
    ]


@router.patch("/customers/{customer_id}")
async def update_customer_status(
    customer_id: int,
    payload: CustomerStatusUpdate,
    _admin: Admin = Depends(current_admin),
    db: AsyncSession = Depends(get_db),
):
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="客户不存在")
    customer.active = payload.active
    await db.commit()
    return {"ok": True, "id": customer.id, "active": customer.active}


@router.get("/merchant-settings")
async def admin_merchant_settings(_admin: Admin = Depends(current_admin), db: AsyncSession = Depends(get_db)):
    settings = await db.scalar(select(MerchantSettings).limit(1))
    if not settings:
        raise HTTPException(status_code=404, detail="商家配置不存在")
    return {
        "wechat_id": settings.wechat_id,
        "qr_image_url": settings.qr_image_url,
        "contact_note": settings.contact_note,
    }


@router.patch("/merchant-settings")
async def update_merchant_settings(
    payload: MerchantSettingsUpdate,
    _admin: Admin = Depends(current_admin),
    db: AsyncSession = Depends(get_db),
):
    settings = await db.scalar(select(MerchantSettings).limit(1))
    if not settings:
        settings = MerchantSettings()
        db.add(settings)
    settings.wechat_id = payload.wechat_id
    settings.qr_image_url = payload.qr_image_url
    settings.contact_note = payload.contact_note
    await db.commit()
    return {"ok": True}


@router.post("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    _admin: Admin = Depends(current_admin),
    db: AsyncSession = Depends(get_db),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    allowed = {
        "PENDING_CONFIRMATION": {"CONFIRMED", "CANCELED"},
        "CONFIRMED": {"COMPLETED", "CANCELED"},
    }
    if payload.status not in allowed.get(order.status, set()):
        raise HTTPException(status_code=409, detail="不允许的订单状态流转")

    old_status = order.status
    variant = await db.get(Variant, order.variant_id)
    if not variant or variant.reserved_stock < order.quantity:
        raise HTTPException(status_code=409, detail="订单库存预留记录异常")
    before_total = variant.total_stock
    before_reserved = variant.reserved_stock
    changed = await db.execute(
        update(Order)
        .where(Order.id == order.id, Order.status == old_status)
        .values(
            status=payload.status,
            admin_note=payload.admin_note,
            confirmed_at=utc_now() if payload.status == "CONFIRMED" else order.confirmed_at,
            finished_at=utc_now() if payload.status in {"COMPLETED", "CANCELED"} else None,
        )
    )
    if changed.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=409, detail="订单状态已经变化")

    if payload.status == "CANCELED":
        stock_values = {"reserved_stock": Variant.reserved_stock - order.quantity}
        if not payload.return_to_stock:
            stock_values["total_stock"] = Variant.total_stock - order.quantity
        stock_changed = await db.execute(
            update(Variant)
            .where(Variant.id == order.variant_id, Variant.reserved_stock >= order.quantity)
            .values(**stock_values)
        )
        change_type = "RELEASED" if payload.return_to_stock else "LOSS"
    elif payload.status == "COMPLETED":
        stock_changed = await db.execute(
            update(Variant)
            .where(Variant.id == order.variant_id, Variant.reserved_stock >= order.quantity)
            .values(
                total_stock=Variant.total_stock - order.quantity,
                reserved_stock=Variant.reserved_stock - order.quantity,
            )
        )
        change_type = "SOLD"
    else:
        stock_changed = None
        change_type = None
    if stock_changed is not None and stock_changed.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=409, detail="库存状态已经变化")
    db.add(
        OrderStatusLog(order_id=order.id, from_status=old_status, to_status=payload.status, source="admin")
    )
    if change_type:
        total_after = before_total - order.quantity if change_type in {"LOSS", "SOLD"} else before_total
        db.add(
            InventoryLog(
                variant_id=order.variant_id,
                order_id=order.id,
                change_type=change_type,
                reason=f"管理员将订单 {order.number} 更新为 {STATUS_LABELS[payload.status]}",
                source="admin",
                total_before=before_total,
                reserved_before=before_reserved,
                total_after=total_after,
                reserved_after=before_reserved - order.quantity,
            )
        )
    await db.commit()
    return {"ok": True, "status": payload.status, "status_label": STATUS_LABELS[payload.status]}
