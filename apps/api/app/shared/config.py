from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE = f"sqlite+aiosqlite:///{API_ROOT / 'data' / 'store.db'}"


class Settings(BaseSettings):
    database_url: str = DEFAULT_DATABASE
    web_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    session_secure: bool = False
    development_sms_code: str = "123456"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.web_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
