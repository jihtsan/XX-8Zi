from shutil import copyfile

from sqlalchemy import func, select

from app.catalog.models import Category, Product, ProductImage, Variant
from app.identity.models import Admin, Customer
from app.merchant_settings.models import MerchantSettings
from app.shared.config import API_ROOT
from app.shared.database import SessionLocal
from app.shared.security import hash_password
from app.shared.storage import resolve_storage_key

SEED_IMAGES = {
    "amethyst-star-orbit": "amethyst-star-orbit.jpg",
    "green-phantom-garden": "green-phantom-garden.jpg",
    "gold-rutile-current": "gold-rutile-current.jpg",
}


async def seed_product_images(db) -> None:
    source_root = API_ROOT.parent / "web" / "public" / "asset" / "picture"
    for slug, filename in SEED_IMAGES.items():
        product = await db.scalar(select(Product).where(Product.slug == slug))
        if not product:
            continue
        storage_key = f"products/{product.id}/seed-{filename}"
        target = resolve_storage_key(storage_key)
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            copyfile(source_root / filename, target)
        existing_image = await db.scalar(
            select(ProductImage).where(ProductImage.product_id == product.id, ProductImage.role == "MAIN")
        )
        if not existing_image:
            db.add(
                ProductImage(
                    product_id=product.id,
                    storage_key=storage_key,
                    role="MAIN",
                    sort_order=0,
                    alt_text=f"{product.name}商品主图",
                )
            )
    await db.commit()


async def seed_data() -> None:
    async with SessionLocal() as db:
        existing = await db.scalar(select(func.count()).select_from(Product))
        if not existing:
            db.add_all(
                [
                    Category(id=1, name="水晶系列", slug="crystal", sort_order=1),
                    Category(id=2, name="木质佛珠", slug="wood-beads", sort_order=2),
                    Category(id=3, name="天然饰品", slug="natural", sort_order=3),
                ]
            )
            db.add_all(
                [
                    Product(
                        id=1,
                        category_id=1,
                        code="CRYSTAL-101",
                        slug="amethyst-star-orbit",
                        name="紫晶星轨",
                        description="深浅紫晶珠体依次排列，保留天然冰裂与棉絮纹理。",
                        material="天然紫水晶 / 925银隔珠 / 弹力线",
                        status="PUBLISHED",
                        sort_order=1,
                    ),
                    Product(
                        id=2,
                        category_id=1,
                        code="CRYSTAL-102",
                        slug="green-phantom-garden",
                        name="绿幽灵庭",
                        description="清透石英中分布苔绿色绿泥石包裹体。",
                        material="天然绿幽灵水晶 / 弹力线",
                        status="PUBLISHED",
                        sort_order=2,
                    ),
                    Product(
                        id=3,
                        category_id=1,
                        code="CRYSTAL-103",
                        slug="gold-rutile-current",
                        name="金发晶流光",
                        description="通透晶体中可见细密而不规则的金色针状包裹体。",
                        material="天然金发晶 / 弹力线",
                        status="PUBLISHED",
                        sort_order=3,
                    ),
                ]
            )
            db.add_all(
                [
                    Variant(
                        id=1,
                        product_id=1,
                        code="AMY-8-16",
                        name="8mm / 16cm",
                        price_cents=29800,
                        total_stock=8,
                    ),
                    Variant(
                        id=2,
                        product_id=1,
                        code="AMY-10-17",
                        name="10mm / 17cm",
                        price_cents=36800,
                        total_stock=5,
                    ),
                    Variant(
                        id=3,
                        product_id=2,
                        code="GPH-9-16",
                        name="9mm / 16cm",
                        price_cents=42800,
                        total_stock=10,
                    ),
                    Variant(
                        id=4,
                        product_id=3,
                        code="GRT-10-17",
                        name="10mm / 17cm",
                        price_cents=62800,
                        total_stock=4,
                    ),
                ]
            )
            db.add(Customer(phone="13800138000", password_hash=hash_password("demo1234")))
            db.add(Admin(username="admin", password_hash=hash_password("admin123!")))
            db.add(
                MerchantSettings(
                    wechat_id="XUANXU_STORE", qr_image_url=None, contact_note="添加后请发送订单编号。"
                )
            )
            await db.commit()
        await seed_product_images(db)
