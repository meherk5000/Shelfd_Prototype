from datetime import datetime
from typing import Optional
from beanie import Document, Indexed, Link
from pydantic import BaseModel, Field, ConfigDict
from zoneinfo import ZoneInfo

from app.database.models.user import User
from app.database.models.club import Club

class ClubMessage(Document):
    club: Link[Club]
    author: Link[User]
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("UTC")))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("UTC")))

    def __init__(self, **data):
        if 'created_at' not in data:
            data['created_at'] = datetime.now(ZoneInfo("UTC"))
        if 'updated_at' not in data:
            data['updated_at'] = datetime.now(ZoneInfo("UTC"))
        super().__init__(**data)

    class Settings:
        name = "club_messages"
        indexes = [
            [("club.$id", 1), ("created_at", -1)],  # For efficient club message queries
            [("author.$id", 1)],  # For user message queries
            [("created_at", -1)],  # For sorting by date
        ]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "club": "507f1f77bcf86cd799439011",
                "author": "507f1f77bcf86cd799439012",
                "content": "Hello everyone!",
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2024-03-20T12:00:00Z"
            }
        }
    ) 