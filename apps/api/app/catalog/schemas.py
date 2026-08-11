from pydantic import BaseModel


class VariantOut(BaseModel):
    id: int
    code: str
    name: str
    reference_price: float
    in_stock: bool


class ProductImageOut(BaseModel):
    id: int
    role: str
    sort_order: int
    alt_text: str
    url: str


class ProductOut(BaseModel):
    id: int
    code: str
    slug: str
    name: str
    category: str
    description: str
    material: str
    price_min: float
    price_max: float
    in_stock: bool
    images: list[ProductImageOut]
    variants: list[VariantOut]
