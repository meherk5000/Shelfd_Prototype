from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    jwt_secret_key: str
    jwt_algorithm: str
    access_token_expire_days: int
    mongodb_user: str
    mongodb_password: str
    mongodb_cluster: str
    mongodb_name: str
    tmdb_api_key: str
    tmdb_base_url: str
    google_books_base_url: str
    cors_origins: str

    @property
    def mongodb_url(self) -> str:
        return f"mongodb+srv://{self.mongodb_user}:{self.mongodb_password}@{self.mongodb_cluster}/?retryWrites=true&w=majority"

    class Config:
        env_file = ".env.production"

settings = Settings()