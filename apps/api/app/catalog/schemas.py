from pydantic import BaseModel


class VariantOut(BaseModel):
    id: int
    code: str
    name: str
    reference_price: float
    in_stock: bool


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
    variants: list[VariantOut]
