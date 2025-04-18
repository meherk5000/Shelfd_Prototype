from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class MessageCreate(BaseModel):
    """Schema for creating a new message."""
    content: str = Field(..., min_length=1, max_length=1000)

class MessageBase(BaseModel):
    id: str
    club_id: str
    author_id: str
    author_username: str
    content: str
    created_at: datetime

class MessageResponse(BaseModel):
    """Schema for message response."""
    id: str
    club_id: str
    author_id: str
    author_username: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True 