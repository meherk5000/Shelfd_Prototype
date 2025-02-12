from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import quote_plus
from fastapi.middleware.cors import CORSMiddleware

class Settings(BaseSettings):
    jwt_secret_key: str
    jwt_algorithm: str
    access_token_expire_days: int
    mongodb_user: str
    mongodb_password: str
    mongodb_cluster: str
    mongodb_name: str = "shelfd"
    tmdb_api_key: str
    tmdb_base_url: str
    google_books_base_url: str
    # Default CORS settings that can be overridden by environment variables
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "https://shelfd-prototype.vercel.app"]

    @property
    def mongodb_url(self) -> str:
        encoded_username = quote_plus(self.mongodb_user)
        encoded_password = quote_plus(self.mongodb_password)
        return f"mongodb+srv://{encoded_username}:{encoded_password}@{self.mongodb_cluster}/?retryWrites=true&w=majority"

    class Config:
        env_file = ".env"
        case_sensitive = True

def get_application():
    _app = FastAPI()

    _app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://shelfd-prototype.vercel.app"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return _app

settings = Settings()