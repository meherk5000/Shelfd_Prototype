from fastapi import APIRouter, Depends, HTTPException, Query, Path, Header
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId

from ..services.auth import get_current_user, oauth2_scheme
from ..services.review_service import ReviewService
from ..database.models.review import MediaType, Review
from ..database.models.user import User
from ..database.schemas.review import (
    CreateReviewRequest,
    UpdateReviewRequest,
    ReviewResponse,
    MediaReviewsResponse
)

router = APIRouter()


@router.post("/reviews", status_code=201)
async def create_review(
    data: CreateReviewRequest,
    token: str = Depends(oauth2_scheme)
):
    """
    Create or update a review for a media item.
    If the user has already reviewed this item, the review will be updated.
    """
    # Add debug log for received data
    print(f"DEBUG - Received review data: {data.dict()}") 
    try:
        user_id = await get_current_user(token)
        
        review = await ReviewService.create_review_and_update_shelf_item(
            user_id=user_id,
            media_id=data.media_id,
            media_type=data.media_type,
            rating=data.rating,
            review_text=data.review_text,
            contains_spoilers=data.contains_spoilers,
            title=data.title,
            image_url=data.image_url,
            creator=data.creator
        )
        
        return {
            "success": True,
            "message": "Review submitted successfully",
            "review_id": str(review.id)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create review: {str(e)}")


@router.get("/reviews/{media_type}/{media_id}")
async def get_media_reviews(
    media_type: str,
    media_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    sort_by: str = Query("newest", regex="^(newest|oldest|highest_rating|lowest_rating|most_liked)$"),
    token: Optional[str] = Header(None, alias="Authorization")
):
    """
    Get all reviews for a media item with pagination and sorting.
    Authentication is optional; if provided, it will show whether the current user has liked each review.
    """
    try:
        # Normalize media type to enum
        try:
            # Convert from URL format (lowercase with hyphens) to enum format (uppercase with underscores)
            media_type_normalized = media_type.upper().replace('-', '_')
            media_type_enum = MediaType[media_type_normalized]
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid media type: {media_type}")
        
        current_user_id = None
        # Check if the Authorization header was actually provided
        if token and token.startswith("Bearer "):
            actual_token = token.split(" ")[1]
            try:
                # Attempt to validate the token and get the user ID
                user = await get_current_user(actual_token) 
                current_user_id = str(user.id)
            except HTTPException as e:
                # If get_current_user raises HTTPException (like 401), re-raise it
                # This allows the frontend interceptor to catch the 401
                raise e 
            except Exception as e:
                # Log other unexpected errors during token validation but don't necessarily block the request
                print(f"Unexpected error validating optional token: {e}")
                # Decide if you want to raise 500 or proceed without auth
                # For now, let's proceed without auth for unexpected errors
                pass 
        
        # Get reviews with stats
        reviews, stats = await ReviewService.get_media_reviews(
            media_id=media_id,
            media_type=media_type_enum,
            current_user_id=current_user_id,
            limit=limit,
            skip=skip,
            sort_by=sort_by
        )
        
        return MediaReviewsResponse(reviews=reviews, stats=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews: {str(e)}")


@router.get("/reviews/user/{media_type}/{media_id}")
async def get_user_review(
    media_type: str,
    media_id: str,
    token: str = Depends(oauth2_scheme)
):
    """Get the current user's review for a specific media item, including user details."""
    try:
        user_id_obj = await get_current_user(token) # Keep this as it might return the User object
        user_id_str = str(user_id_obj.id) # Ensure we have the string ID

        # Normalize media type to enum
        try:
            media_type_normalized = media_type.upper().replace('-', '_')
            media_type_enum = MediaType[media_type_normalized]
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid media type: {media_type}")

        review = await ReviewService.get_user_review(
            user_id=user_id_obj, # Pass the original object or string ID as needed by service
            media_id=media_id,
            media_type=media_type_enum
        )

        if not review:
            return {
                "exists": False,
                "message": "No review found"
                # Consider adding shelf_status here too if needed
            }

        # Enrich the review with username and avatar
        user_info = None
        try:
            # Convert the string user_id from the review back to ObjectId for querying User collection
            user_oid = ObjectId(review.user_id)
            user_info = await User.find_one({"_id": user_oid})
        except Exception as e:
             print(f"WARN: Could not convert review.user_id '{review.user_id}' to ObjectId or find user: {e}")
             # Continue without user info

        username = "Unknown User"
        user_avatar = None
        if user_info:
            username = user_info.username
            user_avatar = getattr(user_info, 'avatar_url', None)

        # Convert review to dict and add user details
        # Use model_dump() for newer Pydantic versions, or dict()
        review_dict = review.model_dump() if hasattr(review, 'model_dump') else review.dict()
        review_dict["id"] = str(review.id) # Ensure ID is string
        review_dict["user_id"] = str(review.user_id) # Ensure user_id is string
        review_dict["username"] = username
        review_dict["user_avatar"] = user_avatar
        # Ensure dates are ISO strings
        review_dict["created_at"] = review.created_at.isoformat() if review.created_at else None
        review_dict["updated_at"] = review.updated_at.isoformat() if review.updated_at else None

        return {
            "exists": True,
            "review": review_dict # Return the enriched dictionary
            # Add shelf_status here if needed
        }
    except Exception as e:
        print(f"ERROR in get_user_review: {str(e)}") # Add logging
        raise HTTPException(status_code=500, detail=f"Failed to fetch user review: {str(e)}")


@router.put("/reviews/{review_id}")
async def update_review(
    review_id: str,
    data: UpdateReviewRequest,
    token: str = Depends(oauth2_scheme)
):
    """Update an existing review."""
    try:
        user_id = await get_current_user(token)
        
        updates = {}
        if data.rating is not None:
            updates["rating"] = data.rating
        if data.review_text is not None:
            updates["review_text"] = data.review_text
        if data.contains_spoilers is not None:
            updates["contains_spoilers"] = data.contains_spoilers
        
        updated_review = await ReviewService.update_review(
            review_id=review_id,
            user_id=user_id,
            updates=updates
        )
        
        if not updated_review:
            raise HTTPException(status_code=404, detail="Review not found or you don't have permission to update it")
        
        return {
            "success": True,
            "message": "Review updated successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update review: {str(e)}")


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: str,
    token: str = Depends(oauth2_scheme)
):
    """Delete a review."""
    try:
        user_obj = await get_current_user(token) # Get the User object
        # Ensure we pass the STRING ID to the service
        user_id_str = str(user_obj.id)

        deleted = await ReviewService.delete_review(
            review_id=review_id,
            user_id=user_id_str # Pass the string ID
        )

        if not deleted:
            # Service now returns False for not found/permission issues
            raise HTTPException(status_code=404, detail="Review not found or you don't have permission to delete it")

        return {
            "success": True,
            "message": "Review deleted successfully"
        }
    except ValueError as e:
        # Catch potential ValueError from ObjectId conversion in service
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
         # Re-raise specific HTTP exceptions (like 401 from get_current_user)
         raise e
    except Exception as e:
        # Catch errors raised from the service (like DB errors during delete)
        print(f"ERROR in DELETE /reviews/{review_id} route handler: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete review: {str(e)}")


@router.post("/reviews/{review_id}/like")
async def like_review(
    review_id: str,
    token: str = Depends(oauth2_scheme)
):
    """Like or unlike a review (toggle)."""
    try:
        user_id = await get_current_user(token)
        
        liked = await ReviewService.like_review(
            user_id=user_id,
            review_id=review_id
        )
        
        return {
            "success": True,
            "message": "Review liked" if liked else "Review unliked"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to like review: {str(e)}")


@router.get("/reviews/user")
async def get_user_reviews(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    token: str = Depends(oauth2_scheme)
):
    """Get all reviews by the current user."""
    try:
        user_id = await get_current_user(token)
        
        reviews = await ReviewService.get_user_reviews(
            user_id=user_id,
            limit=limit,
            skip=skip
        )
        
        return {
            "success": True,
            "reviews": [
                {
                    "id": str(review.id),
                    "media_id": review.media_id,
                    "media_type": review.media_type,
                    "rating": review.rating,
                    "review_text": review.review_text,
                    "contains_spoilers": review.contains_spoilers,
                    "created_at": review.created_at,
                    "updated_at": review.updated_at,
                    "likes_count": review.likes_count
                }
                for review in reviews
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user reviews: {str(e)}")


@router.post("/shelves/rate", status_code=200)
async def legacy_rate_media(
    data: dict, 
    token: str = Depends(oauth2_scheme)
):
    """
    Legacy endpoint for backward compatibility with the old rating system.
    It will add the item to the user's "Finished" shelf if not already there,
    and create a review.
    """
    try:
        print(f"Debug - Rate endpoint called with data: {data}")
        user_id = await get_current_user(token)
        
        # Extract data
        media_id = data.get("media_id")
        media_type_str = data.get("media_type")
        rating = data.get("rating")
        review_text = data.get("review")
        
        if not media_id or not media_type_str or not rating:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Convert media type string to enum
        try:
            print(f"Debug - Attempting to convert media type: {media_type_str}")
            media_type_enum = MediaType[media_type_str]
            print(f"Debug - Converted to enum: {media_type_enum}")
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid media type: {media_type_str}")
        
        # First, ensure the item is in the user's "Finished" shelf
        from ..services.shelf_service import ShelfService
        from ..database.models.shelf import ShelfStatus
        
        print(f"Debug - Looking for shelf item with media_id: {media_id} and media_type: {media_type_enum}")
        # Check if item is already in any shelf
        shelf_items = await ShelfService.get_shelf_items_by_media(
            user_id=user_id,
            media_id=media_id,
            media_type=media_type_enum
        )
        
        print(f"Debug - Found {len(shelf_items)} matching shelf items")
        if not shelf_items:
            print(f"Debug - Item not found in your shelves")
            # Add to "Finished" shelf automatically
            try:
                shelf_result = await ShelfService.add_to_shelf(
                    user_id=user_id,
                    media_id=media_id,
                    media_type=media_type_enum,
                    status=ShelfStatus.FINISHED,
                    media_data={
                        "title": data.get("title", "Unknown Title"),
                        "image_url": data.get("image_url", ""),
                        "creator": data.get("creator", "")
                    }
                )
                
                if not shelf_result.get("success"):
                    raise ValueError("Failed to add to shelf")
                
                print(f"Debug - Added to Finished shelf: {shelf_result}")
            except Exception as e:
                print(f"Debug - Error adding to shelf: {str(e)}")
                # Continue anyway - we'll try to save the review
        
        # Create the review
        try:
            review = await ReviewService.create_review(
                user_id=user_id,
                media_id=media_id,
                media_type=media_type_enum,
                rating=rating,
                review_text=review_text
            )
            
            return {
                "success": True,
                "message": "Rating and review saved successfully",
                "data": {
                    "media_id": media_id,
                    "media_type": str(media_type_enum),
                    "rating": rating,
                    "review": review_text,
                    "review_id": str(review.id)
                }
            }
        except Exception as e:
            print(f"Debug - Error saving rating: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
            
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to save rating: {str(e)}"
        print(f"Debug - Error: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg) 