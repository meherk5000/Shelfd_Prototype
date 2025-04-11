from datetime import datetime
from typing import List, Optional
from beanie import Document, Link, PydanticObjectId
from pydantic import BaseModel, Field

from .user import User

class Club(Document):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    creator: Link[User]
    members: List[Link[User]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    media_type: str = Field(..., pattern="^(book|movie|tv)$")  # Type of media this club focuses on
    is_private: bool = Field(default=False)  # Whether the club is invite-only
    cover_image: Optional[str] = None  # URL to the cover image
    book_title: Optional[str] = None  # Title of the book associated with the club
    book_author: Optional[str] = None  # Author of the book
    book_cover: Optional[str] = None  # URL to the book cover image
    book_id: Optional[str] = None  # ID of the book in the database
    
    class Settings:
        name = "clubs"
        indexes = [
            "creator",  # Simple index on creator
            "members",  # Simple index on members
            "media_type",  # Simple index on media_type
            [("name", "text")],  # Text index for search
            [("created_at", -1)],  # Descending index for sorting by newest
        ]

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Sci-Fi Book Club",
                "description": "A club for science fiction book lovers",
                "media_type": "book",
                "is_private": False,
                "book_title": "Dune",
                "book_author": "Frank Herbert"
            }
        }
    } 