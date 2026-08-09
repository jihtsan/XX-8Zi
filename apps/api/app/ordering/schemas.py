from datetime import datetime

from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=9)
    contact_phone: str = Field(min_length=6, max_length=24)
    wechat_id: str | None = Field(default=None, max_length=100)
    note: str | None = Field(default=None, max_length=1000)
    idempotency_key: str = Field(min_length=8, max_length=80)


class OrderOut(BaseModel):
    id: int
    number: str
    product_name: str
    product_code: str
    variant_name: str
    quantity: int
    reference_unit: float
    reference_total: float
    contact_phone: str
    wechat_id: str | None
    note: str | None
    status: str
    status_label: str
    created_at: datetime


class OrderStatusUpdate(BaseModel):
    status: str
    admin_note: str | None = Field(default=None, max_length=1000)
    return_to_stock: bool = True
