import base64
import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

temporary_database = tempfile.TemporaryDirectory()
database_path = Path(temporary_database.name) / "test.db"
media_path = Path(temporary_database.name) / "uploads"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{database_path}"
os.environ["MEDIA_ROOT"] = str(media_path)

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)

from app.main import app  # noqa: E402


def test_health_and_catalog():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["database"] == "sqlite"

        catalog = client.get("/api/v1/catalog/products")
        assert catalog.status_code == 200
        products = catalog.json()
        assert len(products) == 3
        assert [product["name"] for product in products] == ["紫晶星轨", "绿幽灵庭", "金发晶流光"]
        assert all(product["images"][0]["role"] == "MAIN" for product in products)
        image_response = client.get(products[0]["images"][0]["url"])
        assert image_response.status_code == 200
        assert image_response.headers["content-type"] == "image/jpeg"


def test_demo_customer_can_create_order():
    with TestClient(app) as client:
        login = client.post("/api/v1/auth/login", json={"phone": "13800138000", "password": "demo1234"})
        assert login.status_code == 200

        with patch("app.ordering.router.notify_new_order", new_callable=AsyncMock) as notify:
            created = client.post(
                "/api/v1/orders",
                json={
                    "variant_id": 1,
                    "quantity": 1,
                    "contact_phone": "13800138000",
                    "wechat_id": None,
                    "note": "测试订单",
                    "idempotency_key": "test-order-0001",
                },
            )
        assert created.status_code == 201
        assert created.json()["status"] == "PENDING_CONFIRMATION"
        assert created.json()["product_image_url"].endswith("seed-amethyst-star-orbit.jpg")
        notify.assert_awaited_once()
        notification = notify.await_args.args[0]
        assert notification.number == created.json()["number"]
        assert notification.contact_phone == "13800138000"

        orders = client.get("/api/v1/orders")
        assert orders.status_code == 200
        assert len(orders.json()) == 1


def test_confirmed_order_requires_admin_to_cancel():
    with TestClient(app) as customer_client:
        login = customer_client.post(
            "/api/v1/auth/login",
            json={"phone": "13800138000", "password": "demo1234"},
        )
        assert login.status_code == 200
        created = customer_client.post(
            "/api/v1/orders",
            json={
                "variant_id": 2,
                "quantity": 1,
                "contact_phone": "13800138000",
                "wechat_id": "xuanxu-customer",
                "note": None,
                "idempotency_key": "test-order-admin-0002",
            },
        )
        order_id = created.json()["id"]

        with TestClient(app) as admin_client:
            admin_login = admin_client.post(
                "/api/v1/admin/auth/login",
                json={"username": "admin", "password": "admin123!"},
            )
            assert admin_login.status_code == 200
            confirmed = admin_client.post(
                f"/api/v1/admin/orders/{order_id}/status",
                json={"status": "CONFIRMED", "admin_note": "已私聊确认"},
            )
            assert confirmed.status_code == 200

        customer_cancel = customer_client.post(f"/api/v1/orders/{order_id}/cancel")
        assert customer_cancel.status_code == 409

        with TestClient(app) as admin_client:
            admin_client.post(
                "/api/v1/admin/auth/login",
                json={"username": "admin", "password": "admin123!"},
            )
            canceled = admin_client.post(
                f"/api/v1/admin/orders/{order_id}/status",
                json={"status": "CANCELED", "admin_note": "管理员取消", "return_to_stock": True},
            )
            assert canceled.status_code == 200
            assert canceled.json()["status"] == "CANCELED"


def test_customer_cancel_sends_internal_notification():
    with TestClient(app) as client:
        login = client.post("/api/v1/auth/login", json={"phone": "13800138000", "password": "demo1234"})
        assert login.status_code == 200
        created = client.post(
            "/api/v1/orders",
            json={
                "variant_id": 3,
                "quantity": 1,
                "contact_phone": "13800138000",
                "wechat_id": None,
                "note": None,
                "idempotency_key": "test-order-customer-cancel-0003",
            },
        )

        with patch("app.ordering.router.notify_customer_canceled_order", new_callable=AsyncMock) as notify:
            canceled = client.post(f"/api/v1/orders/{created.json()['id']}/cancel")

        assert canceled.status_code == 200
        assert canceled.json()["status"] == "CANCELED"
        notify.assert_awaited_once()
        notification = notify.await_args.args[0]
        assert notification.number == created.json()["number"]
        assert notification.quantity == 1


def test_admin_can_manage_inventory_and_current_wechat_settings():
    with TestClient(app) as client:
        login = client.post(
            "/api/v1/admin/auth/login",
            json={"username": "admin", "password": "admin123!"},
        )
        assert login.status_code == 200

        catalog = client.get("/api/v1/admin/catalog")
        assert catalog.status_code == 200
        assert [product["status"] for product in catalog.json()] == ["PUBLISHED"] * 3
        variant = catalog.json()[0]["variants"][0]

        below_reserved = client.post(
            f"/api/v1/admin/variants/{variant['id']}/inventory",
            json={"total_stock": 0, "reason": "验证库存下限"},
        )
        assert below_reserved.status_code == 409

        adjusted = client.post(
            f"/api/v1/admin/variants/{variant['id']}/inventory",
            json={"total_stock": variant["total_stock"] + 2, "reason": "测试补货"},
        )
        assert adjusted.status_code == 200
        assert adjusted.json()["available_stock"] == variant["available_stock"] + 2

        settings = client.patch(
            "/api/v1/admin/merchant-settings",
            json={
                "wechat_id": "XUANXU_TEST",
                "qr_image_url": None,
                "contact_note": "请发送订单编号。",
            },
        )
        assert settings.status_code == 200
        public_settings = client.get("/api/v1/merchant-settings")
        assert public_settings.json()["wechat_id"] == "XUANXU_TEST"

        logs = client.get("/api/v1/admin/inventory/logs")
        assert logs.status_code == 200
        assert any(log["change_type"] == "MANUAL_ADJUSTMENT" for log in logs.json())


def test_admin_can_upload_and_manage_product_images():
    with TestClient(app) as client:
        login = client.post(
            "/api/v1/admin/auth/login",
            json={"username": "admin", "password": "admin123!"},
        )
        assert login.status_code == 200

        uploaded = client.post(
            "/api/v1/admin/products/1/images",
            files={"file": ("detail.png", PNG_1X1, "image/png")},
            data={"role": "GALLERY", "sort_order": "1", "alt_text": "紫晶星轨细节"},
        )
        assert uploaded.status_code == 201
        image = uploaded.json()
        assert image["role"] == "GALLERY"
        assert image["url"].startswith("/media/products/1/")
        stored_files = list((media_path / "products" / "1").glob("*.png"))
        assert len(stored_files) == 1
        assert client.get(image["url"]).content == PNG_1X1

        made_main = client.patch(
            f"/api/v1/admin/products/1/images/{image['id']}",
            json={"role": "MAIN"},
        )
        assert made_main.status_code == 200
        catalog = client.get("/api/v1/catalog/products").json()
        assert catalog[0]["images"][0]["id"] == image["id"]

        with TestClient(app) as customer_client:
            customer_client.post(
                "/api/v1/auth/login",
                json={"phone": "13800138000", "password": "demo1234"},
            )
            order = customer_client.post(
                "/api/v1/orders",
                json={
                    "variant_id": 1,
                    "quantity": 1,
                    "contact_phone": "13800138000",
                    "wechat_id": None,
                    "note": None,
                    "idempotency_key": "image-snapshot-0003",
                },
            )
            assert order.status_code == 201
            assert order.json()["product_image_url"] == image["url"]

        invalid = client.post(
            "/api/v1/admin/products/1/images",
            files={"file": ("fake.png", b"not-an-image", "image/png")},
            data={"role": "GALLERY"},
        )
        assert invalid.status_code == 415

        images = client.get("/api/v1/admin/catalog").json()[0]["images"]
        seed_image = next(item for item in images if item["id"] != image["id"])
        assert (
            client.patch(
                f"/api/v1/admin/products/1/images/{seed_image['id']}",
                json={"role": "MAIN"},
            ).status_code
            == 200
        )
        assert client.delete(f"/api/v1/admin/products/1/images/{image['id']}").status_code == 204
        assert stored_files[0].exists()

        with TestClient(app) as customer_client:
            customer_client.post(
                "/api/v1/auth/login",
                json={"phone": "13800138000", "password": "demo1234"},
            )
            orders = customer_client.get("/api/v1/orders").json()
            snapshotted = next(item for item in orders if item["id"] == order.json()["id"])
            assert snapshotted["product_image_url"] == image["url"]
            assert customer_client.get(snapshotted["product_image_url"]).content == PNG_1X1


def test_published_product_cannot_lose_its_main_image():
    with TestClient(app) as client:
        client.post(
            "/api/v1/admin/auth/login",
            json={"username": "admin", "password": "admin123!"},
        )
        product = client.get("/api/v1/admin/catalog").json()[0]
        main_image = next(image for image in product["images"] if image["role"] == "MAIN")
        blocked = client.delete(f"/api/v1/admin/products/1/images/{main_image['id']}")
        assert blocked.status_code == 409

        assert client.patch("/api/v1/admin/products/1", json={"status": "DRAFT"}).status_code == 200
        assert client.delete(f"/api/v1/admin/products/1/images/{main_image['id']}").status_code == 204
        publish = client.patch("/api/v1/admin/products/1", json={"status": "PUBLISHED"})
        assert publish.status_code == 409
        assert publish.json()["detail"] == "商品至少需要一张主图才能上架"
