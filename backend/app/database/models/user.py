from beanie import Document, Indexed
from pydantic import EmailStr
from datetime import datetime
from typing import Optional

class User(Document):
    email: EmailStr = Indexed(unique=True)  # Correct syntax
    username: str = Indexed(unique=True)     # Correct syntax
    hashed_password: str
    full_name: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
    is_active: bool = True
    
    class Settings:
        name = "users"
        
    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "username",
                "full_name": "John Doe",
                "is_active": True
            }
        }