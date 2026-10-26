from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    bmrs_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    bmrs_timeout: int = 30
    cache_ttl_seconds: int = 300
    frontend_origin: str = "*"
    log_level: str = "INFO"


settings = Settings()
