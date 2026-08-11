import os
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

temporary_database = tempfile.TemporaryDirectory()
database_path = Path(temporary_database.name) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{database_path}"

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


def test_demo_customer_can_create_order():
    with TestClient(app) as client:
        login = client.post("/api/v1/auth/login", json={"phone": "13800138000", "password": "demo1234"})
        assert login.status_code == 200

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
