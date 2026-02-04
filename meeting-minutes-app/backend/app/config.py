from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # API Keys
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Database
    database_url: str = "sqlite:///./meeting_minutes.db"

    # App Settings
    max_file_size_mb: int = 500
    supported_formats: str = "mp3,wav,m4a,webm,mp4"

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    @property
    def supported_formats_list(self) -> List[str]:
        return [f.strip().lower() for f in self.supported_formats.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
