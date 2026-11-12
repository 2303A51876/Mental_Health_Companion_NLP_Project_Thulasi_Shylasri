from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Mental Health Companion"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173"

    DATABASE_URL: str = "postgresql+psycopg://mhc:mhc@localhost:5432/mhc"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7
    SESSION_IDLE_TIMEOUT_MINUTES: int = 30
    MAX_FAILED_LOGINS: int = 5
    ACCOUNT_LOCK_MINUTES: int = 15

    DATA_ENCRYPTION_KEY: str  # base64, 32 bytes

    EMAIL_PROVIDER: str = "console"
    SMS_PROVIDER: str = "console"
    ML_MODELS_DIR: str = "ml/saved_models"
    ACTIVE_MODEL_FALLBACK: str = "tfidf_lr"
    TRANSFORMER_LAZY_LOAD: bool = True
    SEED_DEMO_PASSWORD: str = "Demo@12345"

    @field_validator("JWT_SECRET")
    @classmethod
    def _jwt_secret_strength(cls, v: str) -> str:
        if not v.startswith("change_me") and len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and (s.JWT_SECRET.startswith("change_me") or s.DATA_ENCRYPTION_KEY.startswith("change_me")):
        raise RuntimeError("Refusing to start in production with placeholder secrets")
    return s
