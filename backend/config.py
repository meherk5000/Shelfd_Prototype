from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import quote_plus
from fastapi.middleware.cors import CORSMiddleware

class Settings(BaseSettings):
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_DAYS: int
    MONGODB_USER: str
    MONGODB_PASSWORD: str
    MONGODB_CLUSTER: str
    MONGODB_NAME: str = "shelfd"
    TMDB_API_KEY: str
    TMDB_BASE_URL: str
    GOOGLE_BOOKS_BASE_URL: str
    # Default CORS settings that can be overridden by environment variables
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "https://shelfd-prototype.vercel.app"]

    @property
    def mongodb_url(self) -> str:
        encoded_username = quote_plus(self.MONGODB_USER)
        encoded_password = quote_plus(self.MONGODB_PASSWORD)
        return f"mongodb+srv://{encoded_username}:{encoded_password}@{self.MONGODB_CLUSTER}/?retryWrites=true&w=majority"

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