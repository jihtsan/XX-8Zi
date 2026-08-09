from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class MerchantSettings(Base):
    __tablename__ = "merchant_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    wechat_id: Mapped[str] = mapped_column(String(100))
    qr_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_note: Mapped[str] = mapped_column(Text)
