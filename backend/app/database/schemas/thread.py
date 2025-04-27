from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from beanie import PydanticObjectId

# --- Thread Schemas ---

class ThreadCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    # Add other fields if moderators should set them on creation, e.g., thread_type
    # thread_type: str = Field("general", pattern="^(chapter|general)$")

class ThreadBase(ThreadCreate):
    id: PydanticObjectId = Field(..., alias="_id")
    club_id: PydanticObjectId
    creator_id: PydanticObjectId
    created_at: datetime
    updated_at: datetime
    is_locked: bool
    is_pinned: bool
    # Add thread_type if needed in response

    model_config = {
        "populate_by_name": True, # Allows using alias "_id"
        "json_encoders": { PydanticObjectId: str }, # Serialize ObjectId to str
    }


class ThreadResponse(ThreadBase):
    # Could add more fields later, e.g., creator username, last message preview
    pass


# --- Message Schemas ---

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class MessageBase(MessageCreate):
    id: PydanticObjectId = Field(..., alias="_id")
    thread_id: PydanticObjectId
    author_id: PydanticObjectId
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "json_encoders": { PydanticObjectId: str },
    }

class MessageResponse(MessageBase):
    # Could add author username/details here by fetching User
    author_username: str # Add this field
    author_email: Optional[str] = None # Maybe add email if needed 