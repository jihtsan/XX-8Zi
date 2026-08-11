from pydantic import BaseModel, Field


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    material: str | None = Field(default=None, min_length=1, max_length=240)
    status: str | None = None
    sort_order: int | None = None


class VariantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    price_cents: int | None = Field(default=None, ge=0)
    active: bool | None = None


class ProductImageUpdate(BaseModel):
    role: str | None = None
    sort_order: int | None = Field(default=None, ge=0)
    alt_text: str | None = Field(default=None, min_length=1, max_length=240)


class InventoryUpdate(BaseModel):
    total_stock: int = Field(ge=0)
    reason: str = Field(min_length=2, max_length=500)


class CustomerStatusUpdate(BaseModel):
    active: bool


class MerchantSettingsUpdate(BaseModel):
    wechat_id: str = Field(min_length=1, max_length=100)
    qr_image_url: str | None = Field(default=None, max_length=500)
    contact_note: str = Field(min_length=1, max_length=2000)
