from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pydantic import BaseModel
import math
from bson import ObjectId

from ..database.models.review import Review, ReviewLike, MediaType
from ..database.models.user import User
from ..database.schemas.review import ReviewStats
from ..database.models.shelf import ShelfItemModel, ShelfModel, ShelfType
from ..database.schemas.shelf import ShelfStatus


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
        # Ensure user_id is string
        actual_user_id = str(user_id.id) if hasattr(user_id, 'id') else str(user_id)

        review = await Review.find_one({"_id": review_id, "user_id": actual_user_id})
        if not review:
            return None

        # Store original rating before update for potential shelf item update
        original_rating = review.rating
        new_rating = updates.get("rating", original_rating) # Get new rating if provided

        # Apply updates to the Review object
        if "rating" in updates:
            review.rating = updates["rating"]
        if "review_text" in updates:
            review.review_text = updates["review_text"]
        if "contains_spoilers" in updates:
            review.contains_spoilers = updates["contains_spoilers"]

        review.updated_at = datetime.utcnow()
        await review.save() # Save the updated Review first

        # --- Add logic to update ShelfItemModel rating --- 
        if "rating" in updates: # Only update shelf item if rating actually changed
            try:
                # --- Add more specific logging before the update --- 
                print(f"---> UPDATE_SHELF_ITEM: Attempting update for user '{actual_user_id}', media_id '{review.media_id}', type '{review.media_type}'")
                update_query = {
                    "user_id": actual_user_id,
                    "media_id": review.media_id,
                    "media_type": review.media_type
                }
                update_data = {"$set": {"rating": new_rating}}
                print(f"---> UPDATE_SHELF_ITEM: Query: {update_query}")
                print(f"---> UPDATE_SHELF_ITEM: Update Data: {update_data}")
                # --- End specific logging ---
                # Update all matching shelf items for this user and media
                update_result = await ShelfItemModel.find(update_query).update(update_data)

                if update_result.modified_count > 0:
                    print(f"DEBUG [update_review]: Updated {update_result.modified_count} shelf item(s) rating for {review.media_id}")
                else:
                    print(f"DEBUG [update_review]: No shelf items found to update rating for {review.media_id}")

            except Exception as e:
                print(f"WARNING [update_review]: Failed to update shelf item(s) rating: {str(e)}")
                # Continue anyway as the main review was updated
        # --- End added logic ---

        return review

    @staticmethod
    async def delete_review(review_id: str, user_id: str) -> bool:
        """Delete a review if it exists and belongs to the user. Also clears rating/review from associated shelf items."""
        # --- ShelfService import no longer needed here ---
        review_oid = None
        try:
            review_oid = ObjectId(review_id)
        except Exception as e:
            print(f"ERROR: Invalid review_id format for deletion: {review_id}, Error: {e}")
            raise ValueError(f"Invalid review ID format: {review_id}")

        # Find the review
        review = await Review.find_one({"_id": review_oid, "user_id": user_id})
        if not review:
            print(f"WARN: Review not found or user mismatch for deletion: review_id={review_id}, user_id={user_id}")
            return False

        # Store media info before deleting review
        media_id_to_clear = review.media_id
        media_type_to_clear = review.media_type
        actual_user_id = user_id # Already verified string from route

        # Proceed with deletion attempts
        try:
            print(f"INFO: Attempting to delete likes for review {review_id}...")
            await ReviewLike.find({"review_id": review_id}).delete()
            # Simplified log
            print(f"INFO: Likes deletion result logged for review {review_id}.")

            print(f"INFO: Attempting to delete review document {review_id} ({review_oid})...")
            await review.delete()
            print(f"INFO: Successfully deleted review {review_id}")

            # --- Add logic to clear rating/review from ShelfItemModel(s) ---
            try:
                print(f"INFO: Clearing rating/review from ShelfItemModel(s) for user {actual_user_id}, media {media_id_to_clear} ({media_type_to_clear})...")
                update_result = await ShelfItemModel.find(
                    {
                        "user_id": actual_user_id,
                        "media_id": media_id_to_clear,
                        "media_type": media_type_to_clear
                    }
                ).update(
                    {"$set": {"rating": None, "review": None, "review_date": None}}
                )
                print(f"INFO: Cleared rating/review for {update_result.modified_count} ShelfItemModel instance(s).")
            except Exception as shelf_clear_error:
                print(f"ERROR: Failed to clear rating/review from ShelfItemModel(s) after review deletion: {shelf_clear_error}")
                # Log error, but proceed as review deletion was successful
            # --- End clear shelf item logic ---

            return True # Return True as the review was deleted
        except Exception as e:
            print(f"ERROR: Database error during deletion process for review {review_id}: {e}")
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
        contains_spoilers: bool = False,
        title: Optional[str] = None,
        image_url: Optional[str] = None,
        creator: Optional[str] = None
    ) -> Review:
        """Create/update review and also update the shelf item(s) if they exist."""
        # Ensure user_id is a string
        actual_user_id = str(user_id.id) if hasattr(user_id, 'id') else str(user_id)
        
        # Create/update review in the new system
        review = await ReviewService.create_review(
            actual_user_id, media_id, media_type, rating, review_text, contains_spoilers
        )

        # --- Ensure shelf item exists and update it --- 
        try:
            from ..database.models.shelf import ShelfItemModel, ShelfModel, ShelfType
            from ..database.schemas.shelf import ShelfStatus
            from datetime import datetime
            from .shelf_service import ShelfService # Import ShelfService

            # Check if shelf item exists for this user/media
            existing_shelf_item = await ShelfItemModel.find_one({
                "user_id": actual_user_id,
                "media_id": media_id,
                "media_type": media_type
            })
            print(f"DEBUG [create_review_...]: Found existing_shelf_item? {existing_shelf_item.id if existing_shelf_item else 'None'}")

            shelf_item_to_update = None
            if not existing_shelf_item:
                print(f"DEBUG [create_review_...]: Shelf item for {media_id} not found. Adding to Finished shelf.")
                # Log the metadata being used
                print(f"DEBUG [create_review_...]: Metadata for new item - title='{title}', image_url='{image_url}', creator='{creator}'")
                try:
                    # Find the Finished shelf for this media type
                    finished_shelf = await ShelfService.get_or_create_shelf(
                         user_id=actual_user_id,
                         media_type=media_type,
                         status=ShelfStatus.FINISHED.value,
                         shelf_type=ShelfType.DEFAULT
                     )
                    if not finished_shelf:
                         raise ValueError(f"Could not find or create Finished shelf for {media_type}")

                    # Create the shelf item - include rating/review directly
                    new_shelf_item = ShelfItemModel(
                        user_id=actual_user_id,
                        shelf_id=str(finished_shelf.id),
                        media_id=media_id,
                        media_type=media_type,
                        title=title or f"Item {media_id}", 
                        cover_image=image_url, 
                        creator=creator, 
                        rating=rating, # Add rating here
                        review=review_text, # Add review here
                        review_date=datetime.utcnow() # Add review_date here
                    )
                    await new_shelf_item.save()
                    print(f"DEBUG [create_review_...]: Created new ShelfItem {new_shelf_item.id} in Finished shelf with rating/review.")
                    shelf_item_to_update = new_shelf_item
                    # Add item ID to the shelf's list
                    if media_id not in finished_shelf.items:
                        finished_shelf.items.append(media_id)
                        await finished_shelf.save()
                        print(f"DEBUG [create_review_...]: Added {media_id} to Finished shelf items list.")
                    else:
                         print(f"DEBUG [create_review_...]: {media_id} already in Finished shelf items list.")

                except Exception as add_err:
                    print(f"WARNING [create_review_...]: Failed to add shelf item to Finished shelf: {add_err}")
                    # Continue to try updating anyway, in case it existed but query failed
            else:
                print(f"DEBUG [create_review_...]: Found existing shelf item {existing_shelf_item.id}. Will update rating/review.")
                shelf_item_to_update = existing_shelf_item

            # Update the rating/review fields if an item was found or created
            if shelf_item_to_update:
                # Rating/review might have been set during creation, but update again for consistency
                # and to catch the case where the item existed previously.
                shelf_item_to_update.rating = rating
                shelf_item_to_update.review = review_text
                shelf_item_to_update.review_date = datetime.utcnow()
                await shelf_item_to_update.save()
                print(f"DEBUG [create_review_...]: Ensured ShelfItem {shelf_item_to_update.id} has rating={rating}, review='{review_text}'.")

                # --- Add logic to move the item to Finished shelf --- 
                try:
                    print(f"DEBUG [create_review_...]: Attempting to move item {media_id} to Finished shelf...")
                    await ShelfService.move_item(\
                        user_id=actual_user_id,\
                        media_type=media_type,\
                        media_id=media_id,\
                        new_status=ShelfStatus.FINISHED.value\
                    )
                    print(f"DEBUG [create_review_...]: Successfully moved/confirmed item {media_id} in Finished shelf.")
                except ValueError as move_error:
                    print(f"DEBUG [create_review_...]: Warning: Could not move item after review update (it might already be Finished): {move_error}")
                except Exception as move_exception:
                    print(f"ERROR [create_review_...]: Unexpected error moving item after review update: {move_exception}")
                # --- End shelf move logic --- 

            else:
                print(f"WARNING [create_review_...]: Could not find or create ShelfItem to update for {media_id}.")

        except Exception as e:
            print(f"WARNING: Failed during shelf item update/creation: {str(e)}")
            # Continue anyway as the main review was saved
        # --- End ShelfItem logic --- 

        return review 