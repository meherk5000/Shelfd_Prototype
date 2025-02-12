from typing import List, Optional
from datetime import datetime
from beanie import Document, Link
from pydantic import Field
from ..schemas.shelf import MediaType, ShelfType, ShelfStatus
from enum import Enum
from .user import User

class MediaItem(Document):
    media_id: str
    title: str
    image_url: Optional[str]
    creator: Optional[str]
    year: Optional[int]
    date_added: datetime = Field(default_factory=datetime.utcnow)

class ShelfModel(Document):
    user_id: str
    name: str
    media_type: MediaType
    shelf_type: ShelfType
    status: ShelfStatus
    is_default: bool = False
    items: List[str] = []  # List of media IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "shelves"
        indexes = [
            [("user_id", 1), ("media_type", 1), ("name", 1)],  # Compound index
        ]

class ShelfItemModel(Document):
    user_id: str
    shelf_id: str
    media_id: str
    media_type: MediaType
    title: str
    creator: Optional[str] = None
    cover_image: Optional[str] = None
    added_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "shelf_items"
