from pydantic import BaseModel, ConfigDict, Field


class AdminSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class VariantCreate(AdminSchema):
    code: str = Field(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    name: str = Field(min_length=1, max_length=120)
    price_cents: int = Field(ge=0)
    total_stock: int = Field(default=0, ge=0)
    active: bool = True


class ProductCreate(AdminSchema):
    category_id: int = Field(gt=0)
    code: str = Field(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=4000)
    material: str = Field(min_length=1, max_length=240)
    sort_order: int = 0
    initial_variant: VariantCreate


class ProductUpdate(AdminSchema):
    category_id: int | None = Field(default=None, gt=0)
    code: str | None = Field(
        default=None,
        min_length=1,
        max_length=40,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$",
    )
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=120,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    material: str | None = Field(default=None, min_length=1, max_length=240)
    status: str | None = None
    sort_order: int | None = None


class VariantUpdate(AdminSchema):
    code: str | None = Field(
        default=None,
        min_length=1,
        max_length=40,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$",
    )
    name: str | None = Field(default=None, min_length=1, max_length=120)
    price_cents: int | None = Field(default=None, ge=0)
    active: bool | None = None


class ProductImageUpdate(AdminSchema):
    role: str | None = None
    sort_order: int | None = Field(default=None, ge=0)
    alt_text: str | None = Field(default=None, min_length=1, max_length=240)


class InventoryUpdate(AdminSchema):
    total_stock: int = Field(ge=0)
    reason: str = Field(min_length=2, max_length=500)


class CustomerStatusUpdate(BaseModel):
    active: bool


class MerchantSettingsUpdate(BaseModel):
    wechat_id: str = Field(min_length=1, max_length=100)
    qr_image_url: str | None = Field(default=None, max_length=500)
    contact_note: str = Field(min_length=1, max_length=2000)
