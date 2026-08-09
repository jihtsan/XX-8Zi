from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db

from .models import MerchantSettings

router = APIRouter(prefix="/merchant-settings", tags=["merchant-settings"])


@router.get("")
async def current_settings(db: AsyncSession = Depends(get_db)):
    settings = await db.scalar(select(MerchantSettings).limit(1))
    if not settings:
        return {"wechat_id": "", "qr_image_url": None, "contact_note": "请联系商家确认订单。"}
    return {
        "wechat_id": settings.wechat_id,
        "qr_image_url": settings.qr_image_url,
        "contact_note": settings.contact_note,
    }
