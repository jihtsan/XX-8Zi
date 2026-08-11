"""add product images and order image snapshots"""

import sqlalchemy as sa
from alembic import op

revision = "20260811_0002"
down_revision = "20260809_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("alt_text", sa.String(240), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index("ix_product_images_product_id", "product_images", ["product_id"])
    op.create_index("ix_product_images_role", "product_images", ["role"])
    op.create_table(
        "order_image_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("alt_text", sa.String(240), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_order_image_snapshots_order_id",
        "order_image_snapshots",
        ["order_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("order_image_snapshots")
    op.drop_table("product_images")
