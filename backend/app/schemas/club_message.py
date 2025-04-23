from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
from zoneinfo import ZoneInfo

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

    @field_validator('created_at', mode='before')
    def ensure_timezone(cls, value):
        if isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return dt.replace(tzinfo=ZoneInfo("UTC"))
            except ValueError:
                return value
        elif isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=ZoneInfo("UTC"))
        return value

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat() if v.tzinfo else v.replace(tzinfo=ZoneInfo("UTC")).isoformat()
        }
    ) 