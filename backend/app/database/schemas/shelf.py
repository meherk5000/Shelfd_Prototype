from typing import List, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class MediaType(str, Enum):
    BOOK = "book"
    MOVIE = "movie"
    TV_SHOW = "tv_show"
    ARTICLE = "article"

class ShelfType(str, Enum):
    DEFAULT = "default"
    WANT_TO_READ = "want_to_read"
    CURRENTLY_READING = "currently_reading"
    FINISHED_READING = "finished_reading"
    DNF_READING = "dnf_reading"
    WANT_TO_WATCH = "want_to_watch"
    CURRENTLY_WATCHING = "currently_watching"
    FINISHED_WATCHING = "finished_watching"
    DNF_WATCHING = "dnf_watching"
    SAVED = "saved"
    FINISHED = "finished"
    CUSTOM = "custom"

class ShelfStatus(str, Enum):
    WANT_TO = "want_to"  # Want to Read/Watch
    CURRENT = "current"  # Currently Reading/Watching
    FINISHED = "finished"
    DNF = "did_not_finish"
    SAVED = "saved"  # For articles only

class MediaItem(BaseModel):
    media_id: str
    title: str
    media_type: MediaType
    image_url: Optional[str] = None
    creator: Optional[str] = None  # Author/Director
    date_added: datetime = Field(default_factory=datetime.utcnow)
    progress: Optional[int] = None  # Page number or episode number
    notes: Optional[str] = None