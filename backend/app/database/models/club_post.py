from datetime import datetime
from typing import Optional
from beanie import Document, Link, PydanticObjectId
from pydantic import BaseModel, Field

from .user import User
from .club import Club

class ClubPost(Document):
    club: Link[Club]
    author: Link[User]
    content: str = Field(..., min_length=1, max_length=5000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_pinned: bool = Field(default=False)  # For important announcements
    is_edited: bool = Field(default=False)
    
    class Settings:
        name = "club_posts"
        indexes = [
            [("club", 1), ("created_at", -1)],  # For fetching posts in a club by date
            "author",  # Simple index on author
            [("is_pinned", -1)],  # For showing pinned posts first
        ]

    model_config = {
        "json_schema_extra": {
            "example": {
                "content": "Welcome to our first book discussion!",
                "is_pinned": False,
                "is_edited": False
            }
        }
    } 