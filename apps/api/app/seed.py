from sqlalchemy import func, select

from app.catalog.models import Category, Product, Variant
from app.identity.models import Admin, Customer
from app.merchant_settings.models import MerchantSettings
from app.shared.database import SessionLocal
from app.shared.security import hash_password


async def seed_data() -> None:
    async with SessionLocal() as db:
        existing = await db.scalar(select(func.count()).select_from(Product))
        if existing:
            return

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
                    code="CRYSTAL-001",
                    slug="amethyst-orbit",
                    name="紫晶轨道",
                    description="深浅紫晶交错排列，保留天然冰裂与棉絮纹理。",
                    material="天然紫水晶 / 弹力线",
                    status="PUBLISHED",
                    sort_order=1,
                ),
                Product(
                    id=2,
                    category_id=1,
                    code="CRYSTAL-004",
                    slug="obsidian-signal",
                    name="黑曜信号",
                    description="黑曜石珠体搭配一颗银色几何隔珠。",
                    material="天然黑曜石 / 合金隔珠",
                    status="PUBLISHED",
                    sort_order=2,
                ),
                Product(
                    id=3,
                    category_id=1,
                    code="CRYSTAL-009",
                    slug="moonstone-phase",
                    name="月光相位",
                    description="乳白月光石带有柔和蓝光。",
                    material="天然月光石 / 弹力线",
                    status="PUBLISHED",
                    sort_order=3,
                ),
                Product(
                    id=4,
                    category_id=2,
                    code="BEADS-003",
                    slug="sandalwood-cycle",
                    name="檀木周期",
                    description="暖棕檀木珠串，表面保留细密木纹。",
                    material="檀木 / 棉线",
                    status="PUBLISHED",
                    sort_order=4,
                ),
                Product(
                    id=5,
                    category_id=3,
                    code="CRYSTAL-012",
                    slug="tiger-eye-coordinate",
                    name="虎眼坐标",
                    description="金棕虎眼石随角度出现平行光带。",
                    material="天然虎眼石 / 弹力线",
                    status="PUBLISHED",
                    sort_order=5,
                ),
                Product(
                    id=6,
                    category_id=3,
                    code="CRYSTAL-018",
                    slug="white-crystal-index",
                    name="白晶索引",
                    description="透明白水晶与磨砂银色隔珠组合。",
                    material="天然白水晶 / 合金隔珠",
                    status="PUBLISHED",
                    sort_order=6,
                ),
            ]
        )
        db.add_all(
            [
                Variant(
                    id=1, product_id=1, code="AMY-8-16", name="8mm / 16cm", price_cents=26800, total_stock=8
                ),
                Variant(
                    id=2, product_id=1, code="AMY-10-17", name="10mm / 17cm", price_cents=32800, total_stock=5
                ),
                Variant(
                    id=3,
                    product_id=2,
                    code="OBS-10-17",
                    name="10mm / 17cm",
                    price_cents=19800,
                    total_stock=10,
                ),
                Variant(
                    id=4, product_id=3, code="MON-8-16", name="8mm / 16cm", price_cents=38800, total_stock=0
                ),
                Variant(
                    id=5, product_id=4, code="SAN-8-108", name="8mm / 108颗", price_cents=16800, total_stock=6
                ),
                Variant(
                    id=6, product_id=5, code="TIG-10-17", name="10mm / 17cm", price_cents=22800, total_stock=7
                ),
                Variant(
                    id=7, product_id=6, code="WHT-8-16", name="8mm / 16cm", price_cents=18800, total_stock=12
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
