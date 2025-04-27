from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pydantic import BaseModel
import math
from bson import ObjectId

from ..database.models.review import Review, ReviewLike, MediaType
from ..database.models.user import User
from ..database.schemas.review import ReviewStats


class ReviewService:
    @staticmethod
    async def create_review(
        user_id: str,
        media_id: str,
        media_type: MediaType,
        rating: float,
        review_text: Optional[str] = None,
        contains_spoilers: bool = False
    ) -> Review:
        """Create a new review or update if it already exists."""
        # Ensure user_id is a string before querying/saving
        actual_user_id = str(user_id.id) if hasattr(user_id, 'id') else str(user_id)
        
        print(f"DEBUG [create_review]: Args - user={actual_user_id}, media={media_id}, type={media_type}, rating={rating}")
        # Check if review already exists
        print("DEBUG [create_review]: Finding existing review...")
        existing_review = await Review.find_one({
            "user_id": actual_user_id,
            "media_id": media_id,
            "media_type": media_type
        })
        print(f"DEBUG [create_review]: Found existing? {existing_review is not None}")
        
        if existing_review:
            # Update existing review
            print(f"DEBUG [create_review]: Updating existing review {existing_review.id}...")
            existing_review.rating = rating
            existing_review.review_text = review_text
            existing_review.contains_spoilers = contains_spoilers
            existing_review.updated_at = datetime.utcnow()
            await existing_review.save()
            print("DEBUG [create_review]: Update complete.")
            return existing_review
        
        # Create new review
        print("DEBUG [create_review]: Creating new review document...")
        new_review = Review(
            user_id=actual_user_id,
            media_id=media_id,
            media_type=media_type,
            rating=rating,
            review_text=review_text,
            contains_spoilers=contains_spoilers
        )
        print("DEBUG [create_review]: Saving new review...")
        await new_review.save()
        print("DEBUG [create_review]: Save complete.")
        return new_review

    @staticmethod
    async def update_review(
        review_id: str,
        user_id: str,
        updates: dict
    ) -> Optional[Review]:
        """Update an existing review."""
        review = await Review.find_one({"_id": review_id, "user_id": user_id})
        if not review:
            return None
        
        if "rating" in updates:
            review.rating = updates["rating"]
        if "review_text" in updates:
            review.review_text = updates["review_text"]
        if "contains_spoilers" in updates:
            review.contains_spoilers = updates["contains_spoilers"]
        
        review.updated_at = datetime.utcnow()
        await review.save()
        return review

    @staticmethod
    async def delete_review(review_id: str, user_id: str) -> bool:
        """Delete a review if it exists and belongs to the user."""
        review_oid = None # Initialize for logging
        try:
            review_oid = ObjectId(review_id)
        except Exception as e:
            print(f"ERROR: Invalid review_id format for deletion: {review_id}, Error: {e}")
            # Re-raise or raise specific validation error for route handler
            raise ValueError(f"Invalid review ID format: {review_id}")

        # Find the review using ObjectId and string user_id
        review = await Review.find_one({"_id": review_oid, "user_id": user_id})
        if not review:
             print(f"WARN: Review not found or user mismatch for deletion: review_id={review_id}, user_id={user_id}")
             return False # Return False for not found/permission issue

        # Proceed with deletion attempts
        try:
            print(f"INFO: Attempting to delete likes for review {review_id}...")
            delete_likes_result = await ReviewLike.find({"review_id": review_id}).delete()
            print(f"INFO: Likes deletion result for review {review_id}: {delete_likes_result}") # Log result

            print(f"INFO: Attempting to delete review document {review_id} ({review_oid})...")
            await review.delete()
            print(f"INFO: Successfully deleted review {review_id}")
            return True
        except Exception as e:
            # Log the specific error during deletion
            print(f"ERROR: Database error during deletion process for review {review_id}: {e}")
            # Re-raise the exception so the route handler catches it as a 500
            raise e

    @staticmethod
    async def get_user_review(
        user_id: str,
        media_id: str,
        media_type: MediaType
    ) -> Optional[Review]:
        """Get a user's review for a specific media item."""
        # Ensure user_id is consistently queried as a string
        str_user_id = str(user_id.id) if hasattr(user_id, 'id') else str(user_id)
        return await Review.find_one({
            "user_id": str_user_id, # Use the string version
            "media_id": media_id,
            "media_type": media_type
        })

    @staticmethod
    async def get_media_reviews(
        media_id: str,
        media_type: MediaType,
        current_user_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
        sort_by: str = "newest"
    ) -> Tuple[List[dict], ReviewStats]:
        """Get reviews for a media item with optional pagination and sorting."""
        # Set up sorting
        if sort_by == "newest":
            sort = [("created_at", -1)]
        elif sort_by == "oldest":
            sort = [("created_at", 1)]
        elif sort_by == "highest_rating":
            sort = [("rating", -1)]
        elif sort_by == "lowest_rating":
            sort = [("rating", 1)]
        elif sort_by == "most_liked":
            sort = [("likes_count", -1)]
        else:
            sort = [("created_at", -1)]  # Default to newest
        
        # Get reviews
        reviews_query = {"media_id": media_id, "media_type": media_type}
        reviews_cursor = Review.find(reviews_query).sort(sort).skip(skip).limit(limit)
        reviews = await reviews_cursor.to_list()
        
        # Enrich reviews with user info
        enriched_reviews = []
        for review in reviews:
            try:
                # Get user info - try both string and ObjectId formats
                user = await User.find_one({"_id": review.user_id})
                if not user:
                    try:
                        user = await User.find_one({"_id": ObjectId(review.user_id)})
                    except:
                        print(f"WARNING: User {review.user_id} not found for review {review.id}")
                        user = None

                if not user:
                    # Use placeholder user data
                    user_data = {
                        "username": "Deleted User",
                        "avatar_url": None
                    }
                else:
                    user_data = {
                        "username": user.username,
                        "avatar_url": getattr(user, 'avatar_url', None)
                    }
                
                # Check if current user has liked this review
                has_liked = False
                if current_user_id:
                    try:
                        # Keep IDs as strings for ReviewLike queries
                        like = await ReviewLike.find_one({
                            "user_id": str(current_user_id),
                            "review_id": str(review.id)
                        })
                        has_liked = like is not None
                    except Exception as e:
                        print(f"ERROR checking like status: {str(e)}")
                        has_liked = False
                
                # Build enriched review with proper date formatting
                review_dict = {
                    "id": str(review.id),
                    "user_id": str(review.user_id),  # Convert to string
                    "username": user_data["username"],
                    "user_avatar": user_data["avatar_url"],
                    "media_id": review.media_id,
                    "media_type": review.media_type,
                    "rating": review.rating,
                    "review_text": review.review_text,
                    "contains_spoilers": review.contains_spoilers,
                    "created_at": review.created_at.isoformat() if review.created_at else None,
                    "updated_at": review.updated_at.isoformat() if review.updated_at else None,
                    "likes_count": review.likes_count,
                    "has_liked": has_liked
                }
                enriched_reviews.append(review_dict)
            except Exception as e:
                print(f"ERROR: Failed to enrich review {review.id}: {str(e)}")
                continue
        
        # Calculate review stats
        review_stats = await ReviewService.calculate_review_stats(media_id, media_type)
        
        return enriched_reviews, review_stats

    @staticmethod
    async def calculate_review_stats(media_id: str, media_type: MediaType) -> ReviewStats:
        """Calculate review statistics for a media item."""
        # Get all reviews for this media
        reviews = await Review.find(
            {"media_id": media_id, "media_type": media_type}
        ).to_list()
        
        total_reviews = len(reviews)
        
        if total_reviews == 0:
            return ReviewStats(
                average_rating=0.0,
                total_reviews=0,
                rating_distribution={
                    "1.0": 0, "1.5": 0, "2.0": 0, "2.5": 0, 
                    "3.0": 0, "3.5": 0, "4.0": 0, "4.5": 0, "5.0": 0
                }
            )
        
        # Calculate average rating
        total_rating = sum(review.rating for review in reviews)
        average_rating = round(total_rating / total_reviews, 1)  # Round to nearest 0.1
        
        # Calculate rating distribution
        rating_distribution = {
            "1.0": 0, "1.5": 0, "2.0": 0, "2.5": 0, 
            "3.0": 0, "3.5": 0, "4.0": 0, "4.5": 0, "5.0": 0
        }
        
        for review in reviews:
            # Format rating to match our distribution keys (e.g., "5.0" instead of "5")
            str_rating = f"{float(review.rating):.1f}"
            print(f"DEBUG: Processing review rating: {review.rating} -> {str_rating}")
            if str_rating in rating_distribution:
                rating_distribution[str_rating] += 1
            else:
                print(f"WARNING: Unexpected rating value: {str_rating}")
        
        print(f"DEBUG: Final rating distribution: {rating_distribution}")
        
        return ReviewStats(
            average_rating=average_rating,
            total_reviews=total_reviews,
            rating_distribution=rating_distribution
        )

    @staticmethod
    async def like_review(user_id: str, review_id: str) -> bool:
        """Like a review if not already liked by this user."""
        try:
            # Convert review_id to ObjectId if it's not already
            try:
                review_oid = ObjectId(review_id) if not isinstance(review_id, ObjectId) else review_id
            except Exception as e:
                print(f"ERROR: Invalid review_id format: {review_id}")
                return False

            # Find the review
            review = await Review.find_one({"_id": review_oid})
            if not review:
                print(f"WARNING: Review {review_id} not found")
                return False
            
            # Keep IDs as strings for ReviewLike model
            str_user_id = str(user_id)
            str_review_id = str(review_id)
            print(f"DEBUG: Processing like - user_id: {str_user_id}, review_id: {str_review_id}")
            
            # Check if already liked - use string format for both IDs
            existing_like = await ReviewLike.find_one({
                "user_id": str_user_id,
                "review_id": str_review_id
            })
            
            print(f"DEBUG: Existing like found: {existing_like is not None}")
            
            if existing_like:
                # Already liked, so unlike
                print(f"DEBUG: Deleting existing like {existing_like.id}")
                await existing_like.delete()
                
                # Decrement likes count on review
                review.likes_count = max(0, review.likes_count - 1)
                await review.save()
                print(f"DEBUG: Unliked - new likes count: {review.likes_count}")
                return False
            
            # Create new like with string IDs
            like = ReviewLike(
                user_id=str_user_id,
                review_id=str_review_id
            )
            await like.save()
            
            # Increment likes count on review
            review.likes_count += 1
            await review.save()
            print(f"DEBUG: Liked - new likes count: {review.likes_count}")
            
            return True
        except Exception as e:
            print(f"ERROR in like_review: {str(e)}")
            return False
        
    @staticmethod
    async def get_user_reviews(
        user_id: str,
        limit: int = 50,
        skip: int = 0
    ) -> List[Review]:
        """Get all reviews by a user."""
        cursor = Review.find({"user_id": user_id}).sort([("created_at", -1)]).skip(skip).limit(limit)
        return await cursor.to_list()

    @staticmethod
    async def create_review_and_update_shelf_item(
        user_id: str,
        media_id: str,
        media_type: MediaType,
        rating: float,
        review_text: Optional[str] = None,
        contains_spoilers: bool = False
    ) -> Review:
        """Create/update review and also update the shelf item(s) if they exist."""
        # Ensure user_id is a string
        actual_user_id = str(user_id.id) if hasattr(user_id, 'id') else str(user_id)
        
        # Create/update review in the new system
        review = await ReviewService.create_review(
            actual_user_id, media_id, media_type, rating, review_text, contains_spoilers
        )
        
        # Try to update the shelf item rating too for all instances of this item
        try:
            from ..database.models.shelf import ShelfItemModel
            from datetime import datetime
            
            # Update all matching shelf items for this user and media
            update_result = await ShelfItemModel.find({
                "user_id": actual_user_id,
                "media_id": media_id,
                "media_type": media_type
            }).update({
                "$set": {
                    "rating": rating,
                    "review": review_text,
                    "review_date": datetime.utcnow()
                }
            })
            
            if update_result.modified_count > 0:
                print(f"DEBUG: Updated {update_result.modified_count} shelf item(s) rating for {media_id}")
            else:
                 print(f"DEBUG: No shelf items found to update rating for {media_id}")
                 
        except Exception as e:
            print(f"WARNING: Failed to update shelf item(s) rating: {str(e)}")
            # Continue anyway as the main review was saved
        
        return review 