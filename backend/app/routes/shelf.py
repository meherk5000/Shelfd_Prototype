from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from ..database.models.shelf import ShelfModel, ShelfItemModel, MediaType, ShelfType
from ..services.shelf_service import ShelfService
from ..services.auth import get_current_user, oauth2_scheme
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class CreateCustomShelfRequest(BaseModel):
    name: str
    media_type: str
    description: Optional[str] = None
    is_private: bool = False
    has_collaborators: bool = False

@router.post("/create_default")
async def create_default_shelves(token: str = Depends(oauth2_scheme)):
    try:
        user_id = await get_current_user(token)
        shelves = await ShelfService.create_default_shelves(user_id)
        return {"message": "Default shelves created", "shelves": shelves}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user/{media_type}")
async def get_user_shelves(
    media_type: str,
    token: str = Depends(oauth2_scheme)
):
    try:
        # Debug logging
        print(f"Debug - Received media_type: {media_type}")
        
        # Convert media type string to enum
        try:
            media_type_enum = MediaType(media_type)
            print(f"Debug - Converted to MediaType enum: {media_type_enum}")
        except ValueError:
            print(f"Debug - Invalid media type: {media_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid media type: {media_type}"
            )
        
        user = await get_current_user(token)
        user_id = str(user.id)  # Convert User object ID to string
        print(f"Debug - Using user_id: {user_id}")
        
        shelves = await ShelfService.get_user_shelves(user_id, media_type_enum)
        
        if not shelves:
            return []
            
        # Transform the data to match frontend expectations
        transformed_shelves = []
        for shelf in shelves:
            shelf_dict = {
                "_id": str(shelf.id),
                "name": shelf.name,
                "shelf_type": shelf.shelf_type,
                "items": []
            }
            
            # Get items for this shelf
            shelf_items = await ShelfItemModel.find({
                "user_id": user_id,
                "shelf_id": str(shelf.id)
            }).to_list()
            
            shelf_dict["items"] = [
                {
                    "media_id": item.media_id,
                    "title": item.title,
                    "cover_image": item.cover_image,
                    "creator": item.creator,
                    "added_at": item.added_at.isoformat() if item.added_at else None
                }
                for item in shelf_items
            ]
            
            transformed_shelves.append(shelf_dict)
            
        return transformed_shelves
        
    except Exception as e:
        print("Debug - Exception:", str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/add_item")
async def add_to_shelf(
    shelf_item_data: dict,
    token: str = Depends(oauth2_scheme)
):
    try:
        user = await get_current_user(token)
        user_id = str(user.id)

        # --- Basic Validation --- 
        required_fields = ["media_type", "media_id", "title"]
        is_custom_add = "shelf_id" in shelf_item_data
        is_default_add = "status" in shelf_item_data

        if not is_custom_add and not is_default_add:
             raise HTTPException(
                status_code=400,
                detail="Either 'shelf_id' (for custom) or 'status' (for default) must be provided."
            )
        if is_custom_add:
             required_fields.append("shelf_id")
        if is_default_add:
             required_fields.append("status")
             # shelf_type is needed by the service when adding to default by status
             required_fields.append("shelf_type") 

        for field in required_fields:
            if field not in shelf_item_data or not shelf_item_data[field]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing or empty required field: {field}"
                )
        
        # --- Map Media Type --- 
        try:
            media_type_str = shelf_item_data["media_type"].upper()
            media_type = MediaType[media_type_str]
        except KeyError:
             raise HTTPException(
                status_code=400,
                detail=f"Invalid media type provided: {shelf_item_data['media_type']}"
            )

        media_id = shelf_item_data["media_id"]
        title = shelf_item_data["title"]
        creator = shelf_item_data.get("creator")
        cover_image = shelf_item_data.get("image_url")

        # --- Action Logic --- 
        if is_custom_add:
            # --- Add to Specific Custom Shelf --- 
            shelf_id = shelf_item_data["shelf_id"]
            target_shelf = await ShelfModel.get(shelf_id) # Verify shelf exists and belongs to user
            if not target_shelf or target_shelf.user_id != user_id or target_shelf.shelf_type != ShelfType.CUSTOM:
                raise HTTPException(status_code=404, detail="Custom shelf not found or access denied.")
            
            # Check if item is *already in this specific custom shelf*
            item_in_this_shelf = await ShelfItemModel.find_one({
                "user_id": user_id,
                "shelf_id": shelf_id,
                "media_id": media_id
            })
            if item_in_this_shelf:
                 raise HTTPException(
                    status_code=409, 
                    detail=f"'{title}' is already in your custom shelf '{target_shelf.name}'."
                )
            
            # Proceed to add to this specific custom shelf
            result = await ShelfService.add_to_shelf(
                user_id=user_id,
                shelf_id=shelf_id,
                media_id=media_id,
                media_type=media_type,
                title=title,
                creator=creator,
                cover_image=cover_image
            )
            message = f"Added '{title}' to custom shelf '{target_shelf.name}'."

        elif is_default_add:
            # --- Add/Move within Default Shelves --- 
            new_status = shelf_item_data["status"]
            
            # Find if item exists in *any* default shelf for this media type
            existing_default_shelf_item = await ShelfItemModel.find_one({
                "user_id": user_id,
                "media_id": media_id,
                "media_type": media_type,
                "shelf_id": {"$in": [ 
                    str(s.id) for s in await ShelfModel.find({
                        "user_id": user_id, 
                        "media_type": media_type, 
                        "shelf_type": ShelfType.DEFAULT
                    }).to_list()
                ]}
            })

            if existing_default_shelf_item:
                # --- Item Exists in a Default Shelf: Perform a MOVE --- 
                existing_shelf = await ShelfModel.get(existing_default_shelf_item.shelf_id)
                if existing_shelf.status.value == new_status:
                     # Trying to add to the *same* default shelf it's already in
                     raise HTTPException(
                         status_code=409,
                         detail=f"'{title}' is already in your '{existing_shelf.name}' shelf."
                     )
                else:
                     # Move item to the new status/shelf
                     await ShelfService.move_item(
                         user_id=user_id,
                         media_type=media_type,
                         media_id=media_id,
                         new_status=new_status # Service needs to handle finding the correct new shelf
                     )
                     # We need the name of the shelf it was moved *to*
                     new_shelf = await ShelfService.get_shelf_by_status(user_id, media_type, new_status)
                     shelf_name = new_shelf.name if new_shelf else new_status
                     message = f"Moved '{title}' to '{shelf_name}'."
                     result = existing_default_shelf_item # Return existing item data after move
            else:
                # --- Item Does Not Exist in Any Default Shelf: Perform an ADD --- 
                shelf_type_str = shelf_item_data["shelf_type"]
                try:
                    shelf_type = ShelfType(shelf_type_str)
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Invalid shelf_type: {shelf_type_str}")
                
                result = await ShelfService.add_item_to_shelf(
                    user_id=user_id,
                    media_type=media_type,
                    media_id=media_id,
                    status=new_status,
                    title=title,
                    shelf_type=shelf_type,
                    image_url=cover_image,
                    creator=creator
                )
                # We need the name of the shelf it was added *to*
                added_shelf = await ShelfService.get_shelf_by_status(user_id, media_type, new_status)
                shelf_name = added_shelf.name if added_shelf else new_status
                message = f"Added '{title}' to '{shelf_name}'."

        else:
             # Should not happen due to initial validation, but good practice
             raise HTTPException(status_code=500, detail="Internal error: Invalid state.")

        # --- Return Success Response --- 
        return {"message": message, "item_id": str(result.id)} # Return consistent item_id

    except HTTPException as http_exc:
        raise http_exc # Re-raise specific HTTP errors
    except Exception as e:
        print(f"Error in add_to_shelf endpoint: {str(e)}")
        # Consider logging the traceback here for better debugging
        # import traceback
        # print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process request due to an internal error."
        )
    
@router.post("/move_item")
async def move_shelf_item(
    move_data: dict,
    token: str = Depends(oauth2_scheme)
):
    try:
        user_id = await get_current_user(token)
        await ShelfService.move_item(
            user_id=user_id,
            media_type=move_data["media_type"],
            media_id=move_data["media_id"],
            new_status=move_data["new_status"]
        )
        return {"message": "Item moved successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{media_type}/{media_id}")
async def remove_from_shelf(
    media_type: str,
    media_id: str,
    token: str = Depends(oauth2_scheme)
):
    try:
        print(f"Debug - Attempting to remove item: media_type={media_type}, media_id={media_id}")
        user_id = await get_current_user(token)
        print(f"Debug - User ID: {user_id}")
        
        # Convert media_type string to enum using the same logic as add_item
        try:
            # Convert plural to singular and uppercase
            media_type_map = {
                "books": "BOOK",
                "movies": "MOVIE",
                "tv-shows": "TV",
                "articles": "ARTICLE"
            }
            media_type_str = media_type_map.get(media_type.lower())
            if not media_type_str:
                raise KeyError(f"Unknown media type: {media_type}")
                
            media_type_enum = MediaType[media_type_str]
            print(f"Debug - Converted media type to: {media_type_enum}")
        except KeyError:
            print(f"Debug - Invalid media type: {media_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid media type: {media_type}"
            )
            
        result = await ShelfService.remove_from_shelf(
            user_id=user_id,
            media_id=media_id,
            shelf_type=media_type_enum
        )
        print("Debug - Successfully removed item")
        return {"message": "Item removed successfully"}
    except ValueError as e:
        print(f"Debug - ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Debug - Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/custom")
async def create_custom_shelf(
    data: CreateCustomShelfRequest,
    token: str = Depends(oauth2_scheme)
):
    try:
        user = await get_current_user(token)
        user_id = str(user.id)
        
        # Convert media type string to enum
        media_type_map = {
            "Books": MediaType.BOOK,
            "Movies": MediaType.MOVIE,
            "TV Shows": MediaType.TV,
            "Articles": MediaType.ARTICLE,
        }
        
        media_type = media_type_map.get(data.media_type)
        if not media_type:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid media type: {data.media_type}"
            )
        
        # Check if a shelf with the same name and media type already exists for this user
        existing_shelf = await ShelfModel.find_one({
            "user_id": user_id,
            "media_type": media_type,
            "name": data.name
        })

        if existing_shelf:
            raise HTTPException(
                status_code=409, # Use 409 Conflict for duplicates
                detail=f"A shelf named '{data.name}' already exists for {data.media_type}."
            )

        shelf = await ShelfService.create_custom_shelf(
            user_id=user_id,
            name=data.name,
            media_type=media_type,
            description=data.description,
            is_private=data.is_private,
            has_collaborators=data.has_collaborators
        )
        
        return {
            "message": "Custom shelf created successfully",
            "shelf": {
                "id": str(shelf.id),
                "name": shelf.name,
                "media_type": shelf.media_type.value, # Return the enum value string
                "shelf_type": shelf.shelf_type.value, # Return enum value string
                "description": shelf.description,
                "is_private": shelf.is_private,
                "has_collaborators": shelf.has_collaborators,
                "items": [] # New custom shelves start empty
            }
        }
    except HTTPException as http_exc: # Re-raise HTTPExceptions
        raise http_exc
    except Exception as e:
        # Catch other potential errors during creation
        print(f"Error creating custom shelf: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create custom shelf due to an internal error.") # Use 500 for unexpected errors

@router.post("/rate")
async def rate_item(
    data: dict,
    token: str = Depends(oauth2_scheme)
):
    try:
        user_id = await get_current_user(token)
        
        print(f"Debug - Rate endpoint called with data: {data}")
        
        # Validate required fields
        for field in ["media_id", "media_type", "rating"]:
            if field not in data:
                print(f"Debug - Missing required field: {field}")
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        # Validate rating value - must be between 1 and 5 with quarter-star precision
        rating = float(data["rating"])
        if not 1 <= rating <= 5 or (rating * 100) % 25 != 0:
            print(f"Debug - Invalid rating value: {rating}")
            raise HTTPException(
                status_code=400, 
                detail="Rating must be between 1 and 5 with quarter-star precision (e.g., 1, 1.25, 1.5, 1.75, etc.)"
            )
            
        # Convert media_type string to enum
        try:
            # Handle both formats: 'book', 'movie', etc. or 'BOOK', 'MOVIE', etc.
            media_type_str = data["media_type"].upper()
            print(f"Debug - Attempting to convert media type: {media_type_str}")
            media_type = MediaType[media_type_str]
            print(f"Debug - Converted to enum: {media_type}")
        except KeyError:
            error_msg = f"Invalid media type: {data['media_type']}"
            print(f"Debug - {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
            
        # Find the shelf item
        print(f"Debug - Looking for shelf item with media_id: {data['media_id']} and media_type: {media_type}")
        shelf_items = await ShelfItemModel.find({
            "user_id": user_id,
            "media_id": data["media_id"],
            "media_type": media_type
        }).to_list()
        
        print(f"Debug - Found {len(shelf_items)} matching shelf items")
        
        if not shelf_items:
            error_msg = "Item not found in your shelves"
            print(f"Debug - {error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)
            
        # Update the first shelf item's rating and review
        shelf_item = shelf_items[0]
        print(f"Debug - Updating shelf item: {shelf_item.id} with rating: {rating}")
        shelf_item.rating = rating
        
        if "review" in data:
            shelf_item.review = data["review"]
            shelf_item.review_date = datetime.utcnow()
            print(f"Debug - Also updating review: {data['review'][:50]}...")
            
        print(f"Debug - Saving updated shelf item")
        await shelf_item.save()
        print(f"Debug - Save completed successfully")
        
        # Calculate average rating for this media item across all users
        all_ratings = await ShelfItemModel.find({
            "media_id": data["media_id"],
            "media_type": media_type,
            "rating": {"$ne": None}
        }).to_list()
        
        avg_rating = sum(item.rating for item in all_ratings) / len(all_ratings) if all_ratings else 0
        
        return {
            "message": "Rating saved successfully",
            "rating": rating,
            "avg_rating": avg_rating,
            "total_ratings": len(all_ratings)
        }
    except Exception as e:
        print(f"Debug - Error saving rating: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/rating/{media_type}/{media_id}")
async def get_rating(
    media_type: str,
    media_id: str,
    token: str = Depends(oauth2_scheme)
):
    try:
        user_id = await get_current_user(token)
        
        # Convert media_type string to enum
        try:
            # Handle plural form if provided
            media_type_map = {
                "books": "BOOK",
                "movies": "MOVIE",
                "tv-shows": "TV",
                "articles": "ARTICLE"
            }
            media_type_str = media_type_map.get(media_type.lower(), media_type.upper())
            media_type_enum = MediaType[media_type_str]
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid media type: {media_type}")
        
        # Get user's rating for this item
        user_shelf_item = await ShelfItemModel.find_one({
            "user_id": user_id,
            "media_id": media_id,
            "media_type": media_type_enum
        })
        
        # Get all ratings for this media item
        all_ratings = await ShelfItemModel.find({
            "media_id": media_id,
            "media_type": media_type_enum,
            "rating": {"$ne": None}
        }).to_list()
        
        avg_rating = sum(item.rating for item in all_ratings) / len(all_ratings) if all_ratings else 0
        
        result = {
            "total_ratings": len(all_ratings),
            "avg_rating": round(avg_rating, 2) if avg_rating else None
        }
        
        if user_shelf_item:
            result["user_rating"] = user_shelf_item.rating
            result["user_review"] = user_shelf_item.review
            result["user_review_date"] = user_shelf_item.review_date.isoformat() if user_shelf_item.review_date else None
            result["in_shelf"] = True
        else:
            result["in_shelf"] = False
            
        return result
    except Exception as e:
        print(f"Debug - Error getting rating: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))