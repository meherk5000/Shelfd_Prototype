from beanie import Document, Indexed
from pydantic import EmailStr
from datetime import datetime
from typing import Optional, List

class User(Document):
    email: EmailStr = Indexed(unique=True) 
    username: str = Indexed(unique=True)     
    hashed_password: str
    full_name: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
    is_active: bool = True
    club_memberships: List[str] = []  # List of club IDs the user is a member of
    
    class Settings:
        name = "users"
        
    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "username",
                "full_name": "John Doe",
                "is_active": True,
                "club_memberships": []
            }
        }