from beanie import Document
from typing import Optional, List
from .schemas import MediaType, ShelfType

class ShelfModel(Document):
    user_id: str
    name: str
    media_type: MediaType
    status: str
    shelf_type: ShelfType
    
    class Settings:
        name = "shelves"

class ShelfItemModel(Document):
    user_id: str
    shelf_id: str
    media_id: str
    media_type: MediaType
    title: str
    cover_image: Optional[str]
    creator: Optional[str]
    added_at: Optional[str]
    
    class Settings:
        name = "shelf_items" 