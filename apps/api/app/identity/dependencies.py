from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db
from app.shared.security import token_digest
from app.shared.time import utc_now

from .models import Admin, Customer, SessionRecord


async def current_customer(
    customer_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> Customer:
    if not customer_session:
        raise HTTPException(status_code=401, detail="请先登录")
    record = await db.scalar(
        select(SessionRecord).where(
            SessionRecord.token_hash == token_digest(customer_session),
            SessionRecord.actor_type == "customer",
            SessionRecord.expires_at > utc_now(),
        )
    )
    if not record:
        raise HTTPException(status_code=401, detail="登录已过期")
    customer = await db.get(Customer, record.actor_id)
    if not customer or not customer.active:
        raise HTTPException(status_code=403, detail="客户账户不可用")
    return customer


async def current_admin(
    admin_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> Admin:
    if not admin_session:
        raise HTTPException(status_code=401, detail="请先登录后台")
    record = await db.scalar(
        select(SessionRecord).where(
            SessionRecord.token_hash == token_digest(admin_session),
            SessionRecord.actor_type == "admin",
            SessionRecord.expires_at > utc_now(),
        )
    )
    if not record:
        raise HTTPException(status_code=401, detail="后台登录已过期")
    admin = await db.get(Admin, record.actor_id)
    if not admin:
        raise HTTPException(status_code=401, detail="管理员不存在")
    return admin
