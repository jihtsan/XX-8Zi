from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE = f"sqlite+aiosqlite:///{API_ROOT / 'data' / 'store.db'}"
DEFAULT_MEDIA_ROOT = str(API_ROOT / "data" / "uploads")


class Settings(BaseSettings):
    database_url: str = DEFAULT_DATABASE
    web_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    session_secure: bool = False
    development_sms_code: str = "123456"
    media_root: str = DEFAULT_MEDIA_ROOT
    max_image_bytes: int = 8 * 1024 * 1024
    feishu_webhook_url: SecretStr = SecretStr("")
    feishu_webhook_secret: SecretStr = SecretStr("")
    feishu_webhook_timeout_seconds: float = 5.0

    model_config = SettingsConfigDict(env_file=API_ROOT / ".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.web_origins.split(",") if origin.strip()]

    @property
    def media_path(self) -> Path:
        return Path(self.media_root).expanduser().resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
