"""
Application configuration settings for Shelfd backend.
This module manages environment variables and provides centralized access
to configuration settings like database connection, JWT auth, and API keys.
"""

from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import quote_plus
from fastapi.middleware.cors import CORSMiddleware

class Settings(BaseSettings):
    """
    Settings class that loads and validates configuration from environment variables.
    Uses pydantic for validation and type conversion.
    """
    # JWT authentication settings
    JWT_SECRET_KEY: str  # Secret key for signing JWT tokens
    JWT_ALGORITHM: str   # Algorithm used for JWT (typically HS256)
    ACCESS_TOKEN_EXPIRE_DAYS: int  # How long access tokens remain valid
    
    # MongoDB connection settings
    MONGODB_USER: str  # MongoDB username
    MONGODB_PASSWORD: str  # MongoDB password
    MONGODB_CLUSTER: str  # MongoDB cluster address (from connection string)
    MONGODB_NAME: str = "shelfd_db"  # Database name, defaults to shelfd_db
    
    # External API credentials
    TMDB_API_KEY: str  # The Movie Database API key
    TMDB_BASE_URL: str  # The Movie Database API base URL
    GOOGLE_BOOKS_BASE_URL: str  # Google Books API base URL
    
    # CORS settings for frontend access
    # Specifies which origins are allowed to access the API
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "https://shelfd-prototype.vercel.app"]

    @property
    def mongodb_url(self) -> str:
        """
        Constructs the MongoDB connection string with proper URL encoding
        of username and password to handle special characters.
        """
        encoded_username = quote_plus(self.MONGODB_USER)
        encoded_password = quote_plus(self.MONGODB_PASSWORD)
        return f"mongodb+srv://{encoded_username}:{encoded_password}@{self.MONGODB_CLUSTER}/?retryWrites=true&w=majority"

    class Config:
        """Configuration for the settings class"""
        env_file = ".env"  # Load settings from .env file
        case_sensitive = True  # Environment variable names are case-sensitive

def get_application():
    """
    Create and configure a FastAPI application with appropriate middleware.
    This function isn't currently used but is kept for potential future use.
    """
    _app = FastAPI()

    _app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return _app

# Create a global settings instance for import and use throughout the application
settings = Settings()