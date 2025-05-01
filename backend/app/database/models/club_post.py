# app/database/models/club_post.py
# This file contains the ClubPost model, which represents a post in a club.
# It includes fields for the club, author, content, created at, updated at, is pinned, and is edited.
# It also includes settings for the model, including the name of the collection and the indexes.
# It also includes an example of the model.
# NOTE: This is a work in progress and is not yet complete/added to the club page functionality.
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
    is_pinned: bool = Field(default=False)  
    is_edited: bool = Field(default=False)
    
    class Settings:
        name = "club_posts"
        indexes = [
            [("club", 1), ("created_at", -1)],  
            "author",  
            [("is_pinned", -1)],  
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