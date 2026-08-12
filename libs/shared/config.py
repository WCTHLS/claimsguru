import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    # This will automatically pull DATABASE_URL from your environment variables
    database_url: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://claimgpt:claimgpt@localhost:5432/claimgpt"
    )
    database_read_url: str | None = os.getenv(
        "DATABASE_READ_URL",
        None
    )
    
    # You can add other global settings here later (MinIO, Celery, etc.)
    app_name: str = "ClaimGPT-Core"


settings = Settings()