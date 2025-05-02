from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from beanie import PydanticObjectId


class ThreadCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    

class ThreadBase(ThreadCreate):
    id: PydanticObjectId = Field(..., alias="_id")
    club_id: PydanticObjectId
    creator_id: PydanticObjectId
    created_at: datetime
    updated_at: datetime
    is_locked: bool
    is_pinned: bool


    model_config = {
        "populate_by_name": True, 
        "json_encoders": { PydanticObjectId: str }, 
    }


class ThreadResponse(ThreadBase):
    
    pass




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
    
    author_username: str 
    author_email: Optional[str] = None 