import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = os.getenv("ENV", "development")
    API_V1_PREFIX: str = "/api"
    
    # Dataset Limits
    MAX_UPLOAD_SIZE_BYTES: int = 52_428_800  # 50 MB limit
    MAX_ROWS_LIMIT: int = 1_000_000          # 1 Million rows max
    MAX_COLS_LIMIT: int = 1_000              # 1000 columns max
    MAX_PREVIEW_ROWS: int = 10               # Return first 10 rows for preview
    
    # Temporary upload directory
    TEMP_UPLOAD_DIR: str = os.getenv("TEMP_UPLOAD_DIR", "/tmp/datalens_uploads")
    
    # Firebase configuration
    FIREBASE_PROJECT_ID: str = os.getenv("VITE_FIREBASE_PROJECT_ID", os.getenv("FIREBASE_PROJECT_ID", ""))
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    
    # CORS origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
