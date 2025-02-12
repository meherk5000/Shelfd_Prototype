from pydantic_settings import BaseSettings
from urllib.parse import quote_plus

class Settings(BaseSettings):
    mongodb_user: str = "mk5000"
    mongodb_password: str = "Leo@993"
    mongodb_cluster: str = "shelfd.fo4gp.mongodb.net"
    mongodb_name: str = "shelfd_db"
    tmdb_api_key: str = ""
    tmdb_base_url: str = "https://api.themoviedb.org/3"
    google_books_base_url: str = "https://www.googleapis.com/books/v1"
    
    # Add these new fields
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_days: int = 7

    # We need to keep this property
    @property
    def mongodb_url(self) -> str:
        password = quote_plus(self.mongodb_password)
        return f"mongodb+srv://{self.mongodb_user}:{password}@{self.mongodb_cluster}/?retryWrites=true&w=majority&appName=Shelfd"

    class Config:
        env_file = ".env"

settings = Settings()