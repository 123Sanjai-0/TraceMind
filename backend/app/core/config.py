import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TraceMind Observability Platform"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./tracemind.db")
    CORS_ORIGINS: List[str] = ["*"]
    
    # Anomaly Detection Defaults
    Z_SCORE_THRESHOLD: float = 2.5
    LATENCY_DEVIATION_PCT_THRESHOLD: float = 50.0  # 50% increase
    ERROR_RATE_THRESHOLD: float = 0.05  # 5%
    TIME_WINDOW_MINUTES: int = 15
    
    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")  # "mock", "openai", "anthropic", "gemini"
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gpt-4o-mini")
    
    # RAG Settings
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    TOP_K_RETRIEVAL: int = 3

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
