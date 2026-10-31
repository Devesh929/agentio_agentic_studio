import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "TESSERA AI Implementation Studio"
    API_V1_PREFIX: str = "/api"
    
    # Provider credentials (loaded securely from environment or .env)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    LLAMA_CLOUD_API_KEY: str = os.getenv("LLAMA_CLOUD_API_KEY", "")
    
    # Model preferences
    GROQ_PRIMARY_MODEL: str = os.getenv("GROQ_PRIMARY_MODEL", "qwen/qwen3.8-27b")
    GROQ_COMPLEX_MODEL: str = os.getenv("GROQ_COMPLEX_MODEL", "qwen/qwen3.8-27b")
    GROQ_REASONING_EFFORT: str = os.getenv("GROQ_REASONING_EFFORT", "low")
    
    # Feature flags
    LLAMA_PARSE_ENABLED: bool = True
    LLAMA_PARSE_TIER: str = "cost_effective"
    ENABLE_SECOND_MODEL_REVIEW: bool = False
    DEMO_MODE: bool = False
    
    # Storage and database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'data' / 'tessera.db'}"
    STORAGE_ROOT: str = str(BASE_DIR / "data" / "uploads")
    MAX_UPLOAD_MB: int = 25
    APP_ORIGIN: str = "http://localhost:5173"
    
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
