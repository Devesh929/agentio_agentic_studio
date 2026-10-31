import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "TESSERA AI Implementation Studio"
    API_V1_PREFIX: str = "/api"
    
    # Provider credentials (blank placeholders by default)
    GROQ_API_KEY: str = ""
    LLAMA_CLOUD_API_KEY: str = ""
    
    # Model preferences
    GROQ_PRIMARY_MODEL: str = "openai/gpt-oss-20b"
    GROQ_COMPLEX_MODEL: str = "openai/gpt-oss-120b"
    GROQ_REASONING_EFFORT: str = "low"
    
    # Feature flags
    LLAMA_PARSE_ENABLED: bool = False
    LLAMA_PARSE_TIER: str = "cost_effective"
    ENABLE_SECOND_MODEL_REVIEW: bool = False
    DEMO_MODE: bool = True
    
    # Storage and database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'data' / 'tessera.db'}"
    STORAGE_ROOT: str = str(BASE_DIR / "data" / "uploads")
    MAX_UPLOAD_MB: int = 25
    APP_ORIGIN: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=[
            str(BASE_DIR / ".env"),
            str(BASE_DIR.parent / ".env"),
            str(BASE_DIR.parent / ".env.local"),
        ],
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
Path(settings.STORAGE_ROOT).mkdir(parents=True, exist_ok=True)
Path(BASE_DIR / "data").mkdir(parents=True, exist_ok=True)
