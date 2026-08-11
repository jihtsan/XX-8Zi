"""baseline the phase-one schema"""

import sqlalchemy as sa
from alembic import op

revision = "20260809_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone", sa.String(24), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_customers_phone", "customers", ["phone"], unique=True)
    op.create_table(
        "admins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(80), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_admins_username", "admins", ["username"], unique=True)
    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("actor_type", sa.String(20), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_sessions_token_hash", "sessions", ["token_hash"], unique=True)
    op.create_index("ix_sessions_actor_type", "sessions", ["actor_type"])
    op.create_index("ix_sessions_actor_id", "sessions", ["actor_id"])
    op.create_index("ix_sessions_expires_at", "sessions", ["expires_at"])
    op.create_table(
        "merchant_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("wechat_id", sa.String(100), nullable=False),
        sa.Column("qr_image_url", sa.String(500), nullable=True),
        sa.Column("contact_note", sa.Text(), nullable=False),
    )
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("material", sa.String(240), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("code"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_products_status", "products", ["status"])
    op.create_table(
        "variants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("total_stock", sa.Integer(), nullable=False),
        sa.Column("reserved_stock", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_variants_product_id", "variants", ["product_id"])
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.String(40), nullable=False),
        sa.Column("idempotency_key", sa.String(80), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("variant_id", sa.Integer(), sa.ForeignKey("variants.id"), nullable=False),
        sa.Column("product_name", sa.String(120), nullable=False),
        sa.Column("product_code", sa.String(40), nullable=False),
        sa.Column("variant_name", sa.String(120), nullable=False),
        sa.Column("reference_unit_cents", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("contact_phone", sa.String(24), nullable=False),
        sa.Column("wechat_id", sa.String(100), nullable=True),
        sa.Column("customer_note", sa.Text(), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_orders_number", "orders", ["number"], unique=True)
    op.create_index("ix_orders_idempotency_key", "orders", ["idempotency_key"], unique=True)
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_variant_id", "orders", ["variant_id"])
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_table(
        "inventory_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("variant_id", sa.Integer(), sa.ForeignKey("variants.id"), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("change_type", sa.String(32), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("total_before", sa.Integer(), nullable=False),
        sa.Column("reserved_before", sa.Integer(), nullable=False),
        sa.Column("total_after", sa.Integer(), nullable=False),
        sa.Column("reserved_after", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_inventory_logs_variant_id", "inventory_logs", ["variant_id"])
    op.create_index("ix_inventory_logs_order_id", "inventory_logs", ["order_id"])
    op.create_table(
        "order_status_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("from_status", sa.String(32), nullable=True),
        sa.Column("to_status", sa.String(32), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_order_status_logs_order_id", "order_status_logs", ["order_id"])


def downgrade() -> None:
    op.drop_table("order_status_logs")
    op.drop_table("inventory_logs")
    op.drop_table("orders")
    op.drop_table("variants")
    op.drop_table("products")
    op.drop_table("merchant_settings")
    op.drop_table("sessions")
    op.drop_table("admins")
    op.drop_table("customers")
    op.drop_table("categories")
