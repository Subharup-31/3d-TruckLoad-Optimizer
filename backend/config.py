import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "LogiLoad India AI Platform"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Secret Key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "logiload_production_secret_key_change_in_prod_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: SQLite fallback if PostgreSQL not configured
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/logiload.db")
    
    # OpenRouter API Key for LLM
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", os.getenv("VITE_OPENROUTER_API_KEY", ""))
    
    # Model Artifacts Directory
    MODEL_DIR: Path = BASE_DIR / "models"
    DATA_DIR: Path = BASE_DIR / "ml" / "data"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
