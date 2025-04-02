from datetime import datetime
from typing import Optional
from beanie import Document, Link, PydanticObjectId
from pydantic import BaseModel, Field

from .user import User
from .club import Club

class ClubMilestone(Document):
    club: Link[Club]
    creator: Link[User]
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    milestone_date: datetime = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_auto_generated: bool = Field(default=False)  # Whether milestone was auto-generated for a book club
    
    class Settings:
        name = "club_milestones"
        indexes = [
            "club",  # Simple index on club
            [("club", 1), ("milestone_date", 1)],  # For fetching milestones by date
        ]

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Kickoff",
                "description": "Welcome to the book club!",
                "milestone_date": "2023-04-05T00:00:00Z"
            }
        }
    } 