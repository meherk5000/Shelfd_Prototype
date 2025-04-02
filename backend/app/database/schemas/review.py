from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum


class MediaType(str, Enum):
    BOOK = "book"
    MOVIE = "movie"
    TV_SHOW = "tv_show"
    ARTICLE = "article"


class ReviewBase(BaseModel):
    """Base review schema with common fields."""
    media_id: str
    media_type: MediaType


class CreateReviewRequest(ReviewBase):
    """Schema for creating a new review."""
    rating: float
    review_text: Optional[str] = None
    contains_spoilers: bool = False
    
    @validator('rating')
    def validate_rating(cls, v):
        # Allow ratings from 1-5 with half-star increments (1, 1.5, 2, 2.5, etc.)
        allowed_values = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
        if v not in allowed_values:
            raise ValueError(f'Rating must be one of {allowed_values}')
        return v


class UpdateReviewRequest(BaseModel):
    """Schema for updating an existing review."""
    rating: Optional[float] = None
    review_text: Optional[str] = None
    contains_spoilers: Optional[bool] = None
    
    @validator('rating')
    def validate_rating(cls, v):
        if v is not None:
            allowed_values = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
            if v not in allowed_values:
                raise ValueError(f'Rating must be one of {allowed_values}')
        return v


class ReviewResponse(ReviewBase):
    """Schema for review response, including the review details and user info."""
    id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    rating: float
    review_text: Optional[str] = None
    contains_spoilers: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    likes_count: int
    has_liked: bool = False
    
    class Config:
        orm_mode = True


class ReviewStats(BaseModel):
    """Statistics about reviews for a media item."""
    average_rating: float
    total_reviews: int
    rating_distribution: dict  # Count of reviews for each rating (1.0, 1.5, etc.)


class MediaReviewsResponse(BaseModel):
    """Full response for media reviews endpoint."""
    reviews: List[ReviewResponse]
    stats: ReviewStats 