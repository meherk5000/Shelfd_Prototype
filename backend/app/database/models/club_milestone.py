# app/database/models/club_milestone.py
# This file contains the ClubMilestone model, which represents a milestone in a club.
# It includes fields for the club, creator, title, description, milestone date, created at, updated at, is auto-generated, and is pinned.
# It also includes settings for the model, including the name of the collection and the indexes.
# It also includes an example of the model.
# NOTE: This is a work in progress and is not yet complete/added to the club page functionality.

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
    is_auto_generated: bool = Field(default=False)  
    class Settings:
        name = "club_milestones"
        indexes = [
            "club",  
            [("club", 1), ("milestone_date", 1)],  
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