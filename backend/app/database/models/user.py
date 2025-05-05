"""
User data model for MongoDB using Beanie ODM.
This model defines the structure and validation for user data stored in the database.
"""

from beanie import Document, Indexed
from pydantic import EmailStr
from datetime import datetime
from typing import Optional, List

class User(Document):
    """
    User document model representing a registered app user.
    
    This model serves as both the database schema and validation model for users.
    It includes authentication fields, profile information, and relationships
    to other data like club memberships.
    """
    # Authentication and identity fields
    email: EmailStr = Indexed(unique=True)  # Email address (unique, indexed for lookups)
    username: str = Indexed(unique=True)    # Username (unique, indexed for lookups)
    hashed_password: str  # Stored as a bcrypt hash, never in plain text
    
    # Profile fields
    full_name: Optional[str] = None  # User's full name (optional)
    
    # Timestamps
    created_at: datetime = datetime.utcnow()  # When the account was created
    updated_at: datetime = datetime.utcnow()  # When the account was last updated
    
    # Account status
    is_active: bool = True  # Whether the account is active or disabled
    
    # Relationships
    club_memberships: List[str] = []  # List of club IDs the user is a member of
    
    class Settings:
        """Beanie ODM settings for the User model"""
        name = "users"  # Collection name in MongoDB
        
    class Config:
        """Pydantic configuration with examples for documentation"""
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "username",
                "full_name": "John Doe",
                "is_active": True,
                "club_memberships": []
            }
        }