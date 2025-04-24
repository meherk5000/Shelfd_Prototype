from typing import List, Optional
from datetime import datetime
from beanie import Document, Link
from pydantic import Field
from enum import Enum
from .user import User

class MediaType(str, Enum):
    BOOK = "book"
    MOVIE = "movie"
    TV = "tv"
    ARTICLE = "article"

class Review(Document):
    """
    Review model for books, movies, and TV shows.
    Inspired by Goodreads, The StoryGraph, and Letterboxd.
    """
    # Required fields
    user_id: str  # User who created the review
    media_id: str  # ID of the book, movie, or TV show
    media_type: MediaType  # Type of media (book, movie, TV show)
    rating: float  # 1-5 stars, allowing half-stars (e.g., 3.5)
    
    # Optional fields
    review_text: Optional[str] = None  # Text review content
    contains_spoilers: bool = False  # Flag for spoiler content
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None  # Last edit timestamp
    
    # Stats
    likes_count: int = 0  # Number of likes/upvotes
    
    class Settings:
        name = "reviews"
        indexes = [
            [("user_id", 1), ("media_id", 1), ("media_type", 1)],  # Compound index for uniqueness
            [("media_id", 1), ("media_type", 1)],  # For retrieving all reviews for a media item
            [("user_id", 1)],  # For retrieving all reviews by a user
            [("created_at", -1)]  # For sorting by date
        ]


class ReviewLike(Document):
    """
    Tracks which users have liked which reviews.
    """
    user_id: str  # User who liked the review (stored as string)
    review_id: str  # ID of the review that was liked (stored as string)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "review_likes"
        indexes = [
            [("user_id", 1), ("review_id", 1)],  # Compound index for uniqueness
            [("review_id", 1)]  # For retrieving all likes for a review
        ] 