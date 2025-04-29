from typing import List, Optional
from datetime import datetime
from beanie import Document
from pydantic import Field
from ..schemas.shelf import MediaType

class Recommendation(Document):
    user_id: str
    media_id: str
    media_type: MediaType
    title: str
    creator: Optional[str] = None
    image_url: Optional[str] = None
    similarity_score: float
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "recommendations"
        indexes = [
            [("user_id", 1)],
            [("user_id", 1), ("media_type", 1)],
            [("generated_at", -1)]
        ] 