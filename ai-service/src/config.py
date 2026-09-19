"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_provider: str = "deterministic"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    allowed_origins: str = "http://localhost:5173"
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return configured origins without silently enabling wildcard CORS."""
        origins = [origin.strip() for origin in self.allowed_origins.split(",")]
        return [origin for origin in origins if origin and origin != "*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

