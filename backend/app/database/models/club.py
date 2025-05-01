# app/database/models/club.py
# This file contains the Club model, which represents a club in the database.
# It includes fields for the club, creator, members, created at, updated at, media type, is private, cover image, book title, book author, book cover, book id, movie title, movie director, movie year, movie poster, movie id, tv title, tv creator, tv year, tv poster, tv id, tv season, tv episode.
# It also includes settings for the model, including the name of the collection and the indexes.
# It also includes an example of the model.

from datetime import datetime
from typing import List, Optional
from beanie import Document, Link, PydanticObjectId
from pydantic import BaseModel, Field

from .user import User

class Club(Document):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    creator: Link[User]
    members: List[Link[User]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    media_type: str = Field(..., pattern="^(book|movie|tv)$")  # Type of media this club focuses on
    is_private: bool = Field(default=False)  # Whether the club is invite-only
    cover_image: Optional[str] = None  # URL to the cover image
    
    # Book-specific fields
    book_title: Optional[str] = None  # Title of the book associated with the club
    book_author: Optional[str] = None  # Author of the book
    book_cover: Optional[str] = None  # URL to the book cover image
    book_id: Optional[str] = None  # ID of the book in the database
    
    # Movie-specific fields
    movie_title: Optional[str] = None  # Title of the movie
    movie_director: Optional[str] = None  # Director of the movie
    movie_year: Optional[int] = None  # Release year
    movie_poster: Optional[str] = None  # URL to the movie poster
    movie_id: Optional[str] = None  # ID of the movie in the database
    
    # TV Show-specific fields
    tv_title: Optional[str] = None  # Title of the TV show
    tv_creator: Optional[str] = None  # Creator/showrunner of the TV show
    tv_year: Optional[int] = None  # First air year
    tv_poster: Optional[str] = None  # URL to the TV show poster
    tv_id: Optional[str] = None  # ID of the TV show in the database
    tv_season: Optional[int] = None  # Current season being watched
    tv_episode: Optional[int] = None  # Current episode being watched
    
    class Settings:
        name = "clubs"
        indexes = [
            "creator",  # Simple index on creator
            "members",  # Simple index on members
            "media_type",  # Simple index on media_type
            [("name", "text")],  # Text index for search
            [("created_at", -1)],  # Descending index for sorting by newest
        ]

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Sci-Fi Book Club",
                "description": "A club for science fiction book lovers",
                "media_type": "book",
                "is_private": False,
                "book_title": "Dune",
                "book_author": "Frank Herbert"
            }
        }
    } 