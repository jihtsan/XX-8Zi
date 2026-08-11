from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db

from .models import Category, Product, Variant
from .schemas import ProductOut, VariantOut

router = APIRouter(prefix="/catalog", tags=["catalog"])


async def build_product(product: Product, category: Category, db: AsyncSession) -> ProductOut:
    variants = list(
        (
            await db.scalars(
                select(Variant).where(Variant.product_id == product.id, Variant.active.is_(True))
            )
        ).all()
    )
    prices = [variant.price_cents for variant in variants] or [0]
    return ProductOut(
        id=product.id,
        code=product.code,
        slug=product.slug,
        name=product.name,
        category=category.name,
        description=product.description,
        material=product.material,
        price_min=min(prices) / 100,
        price_max=max(prices) / 100,
        in_stock=any(variant.available_stock > 0 for variant in variants),
        variants=[
            VariantOut(
                id=variant.id,
                code=variant.code,
                name=variant.name,
                reference_price=variant.price_cents / 100,
                in_stock=variant.available_stock > 0,
            )
            for variant in variants
        ],
    )


@router.get("/products", response_model=list[ProductOut])
async def list_products(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Product, Category)
            .join(Category, Product.category_id == Category.id)
            .where(Product.status == "PUBLISHED", Category.active.is_(True))
            .order_by(Product.sort_order, Product.created_at.desc())
        )
    ).all()
    return [await build_product(product, category, db) for product, category in rows]


@router.get("/products/{slug}", response_model=ProductOut)
async def product_detail(slug: str, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(Product, Category)
            .join(Category, Product.category_id == Category.id)
            .where(Product.slug == slug, Product.status == "PUBLISHED")
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="商品不存在或已下架")
    return await build_product(row[0], row[1], db)
