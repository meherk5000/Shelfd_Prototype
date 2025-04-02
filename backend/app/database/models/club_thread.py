from datetime import datetime
from typing import Optional
from beanie import Document, Link, PydanticObjectId
from pydantic import BaseModel, Field

from .user import User
from .club import Club

class ClubThread(Document):
    club: Link[Club]
    creator: Link[User]
    title: str = Field(..., min_length=1, max_length=200)
    thread_type: str = Field(..., pattern="^(chapter|general)$")  # chapter or general
    chapter_number: Optional[int] = None  # Only for chapter threads
    order: int = Field(default=0)  # For ordering threads
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_locked: bool = Field(default=False)  # Whether the thread is locked for new posts
    is_pinned: bool = Field(default=False)  # Whether the thread is pinned to the top
    is_auto_generated: bool = Field(default=False)  # Whether thread was auto-generated for a book club
    
    class Settings:
        name = "club_threads"
        indexes = [
            "club",  # Simple index on club
            [("club", 1), ("order", 1)],  # For fetching threads in order
            [("club", 1), ("thread_type", 1)],  # For fetching by type
        ]

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Chapter 1: The Arrival",
                "thread_type": "chapter",
                "chapter_number": 1,
                "order": 1
            }
        }
    } 