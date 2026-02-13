from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    TBA_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./data/scout.db"
    TBA_BASE_URL: str = "https://www.thebluealliance.com/api/v3"
    STATBOTICS_BASE_URL: str = "https://api.statbotics.io/v3"
    CACHE_TTL_SECONDS: int = 3600

    model_config = {"env_file": ".env"}


settings = Settings()
