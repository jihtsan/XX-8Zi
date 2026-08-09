from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.config import get_settings
from app.shared.database import get_db
from app.shared.security import hash_password, new_session_token, session_expiry, verify_password
from app.shared.time import utc_now

from .dependencies import current_customer
from .models import Customer, SessionRecord
from .schemas import CustomerLogin, CustomerOut, CustomerRegister

router = APIRouter(prefix="/auth", tags=["identity"])


def set_session_cookie(response: Response, name: str, token: str) -> None:
    response.set_cookie(
        name,
        token,
        httponly=True,
        secure=get_settings().session_secure,
        samesite="lax",
        max_age=14 * 24 * 60 * 60,
        path="/",
    )


async def create_customer_session(customer: Customer, db: AsyncSession, response: Response) -> None:
    token, digest = new_session_token()
    db.add(
        SessionRecord(
            token_hash=digest, actor_type="customer", actor_id=customer.id, expires_at=session_expiry()
        )
    )
    customer.last_login_at = utc_now()
    await db.commit()
    set_session_cookie(response, "customer_session", token)


@router.post("/register", response_model=CustomerOut)
async def register(payload: CustomerRegister, response: Response, db: AsyncSession = Depends(get_db)):
    if payload.sms_code != get_settings().development_sms_code:
        raise HTTPException(status_code=400, detail="短信验证码不正确")
    if await db.scalar(select(Customer).where(Customer.phone == payload.phone)):
        raise HTTPException(status_code=409, detail="手机号已经注册")
    customer = Customer(phone=payload.phone, password_hash=hash_password(payload.password))
    db.add(customer)
    await db.flush()
    await create_customer_session(customer, db, response)
    return CustomerOut(id=customer.id, phone=customer.phone, active=customer.active)


@router.post("/login", response_model=CustomerOut)
async def login(payload: CustomerLogin, response: Response, db: AsyncSession = Depends(get_db)):
    customer = await db.scalar(select(Customer).where(Customer.phone == payload.phone))
    if not customer or not verify_password(payload.password, customer.password_hash):
        raise HTTPException(status_code=401, detail="手机号或密码不正确")
    if not customer.active:
        raise HTTPException(status_code=403, detail="客户账户已停用")
    await create_customer_session(customer, db, response)
    return CustomerOut(id=customer.id, phone=customer.phone, active=customer.active)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("customer_session", path="/")
    return {"ok": True}


@router.get("/me", response_model=CustomerOut)
async def me(customer: Customer = Depends(current_customer)):
    return CustomerOut(id=customer.id, phone=customer.phone, active=customer.active)
