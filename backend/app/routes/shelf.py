from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from ..database.models.shelf import ShelfModel, ShelfItemModel, MediaType, ShelfType, ShelfStatus
from ..services.shelf_service import ShelfService
from ..services.auth import get_current_user, oauth2_scheme
from pydantic import BaseModel, Field
from datetime import datetime

router = APIRouter()

class CreateCustomShelfRequest(BaseModel):
    name: str
    media_type: str
    description: Optional[str] = None
    is_private: bool = False
    has_collaborators: bool = False

class RateItemRequest(BaseModel):
    media_id: str
    media_type: str
    rating: float
    review: Optional[str] = None
    title: Optional[str] = None
    image_url: Optional[str] = None
    creator: Optional[str] = None

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
        print(f"Route Handler - Received media_type: {media_type}")
        
        # Convert media type string to enum
        try:
            media_type_enum = MediaType(media_type)
            print(f"Route Handler - Converted to MediaType enum: {media_type_enum}")
        except ValueError:
            print(f"Route Handler - Invalid media type: {media_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid media type: {media_type}"
            )
        
        user = await get_current_user(token)
        user_id = str(user.id)
        print(f"Route Handler - Using user_id: {user_id}")
        
        # Call the service function which now returns the fully processed list of dicts
        processed_shelves = await ShelfService.get_user_shelves(user_id, media_type_enum)
        
        # Return the result directly
        print(f"Route Handler - Returning {len(processed_shelves)} processed shelves from service")
        return processed_shelves
        
    except HTTPException as http_exc:
        # Re-raise specific HTTP errors
        raise http_exc
    except Exception as e:
        print(f"Route Handler - Unhandled Exception: {str(e)}")
        # Log the full traceback for unexpected errors
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An internal error occurred while retrieving shelves.")

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
        user_id = await get_current_user(token)
        
        # Convert media_type string to enum using the same logic as add_item
        try:
            # Convert plural to singular and uppercase
            media_type_map = {
                "book": "BOOK",
                "movie": "MOVIE",
                "tv": "TV",
                "article": "ARTICLE"
            }
            media_type_str = media_type_map.get(media_type.lower())
            if not media_type_str:
                raise KeyError(f"Unknown media type: {media_type}")
                
            media_type_enum = MediaType[media_type_str]
        except KeyError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid media type: {media_type}"
            )
            
        removed = await ShelfService.remove_from_shelf(
            user_id=user_id,
            media_id=media_id,
            media_type=media_type_enum
        )
        return {"message": "Item removed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
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

@router.post("/rate", status_code=200)
async def rate_item(
    data: RateItemRequest,
    token: str = Depends(oauth2_scheme)
):
    try:
        user = await get_current_user(token)
        user_id = str(user.id)

        print(f"RATE ENDPOINT - User: {user_id}")
        print(f"RATE ENDPOINT - Received data: {data.dict()}")

        if not 1 <= data.rating <= 5:
            raise HTTPException(
                status_code=400,
                detail="Rating must be between 1 and 5."
            )

        try:
            media_type_enum = MediaType[data.media_type.upper()]
            print(f"RATE ENDPOINT - Converted media type: {media_type_enum}")
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid media type: {data.media_type}")

        print(f"RATE ENDPOINT - Finding ShelfItemModel for user {user_id}, media_id {data.media_id}, type {media_type_enum}")
        shelf_items = await ShelfItemModel.find({
            "user_id": user_id,
            "media_id": data.media_id,
            "media_type": media_type_enum
        }).to_list()

        if not shelf_items:
            print(f"RATE ENDPOINT - ShelfItem not found for {data.media_id}. Item must be shelved first.")
            raise HTTPException(status_code=404, detail="Item not found in your shelves. Add it first before rating.")

        print(f"RATE ENDPOINT - Found {len(shelf_items)} matching ShelfItems. Updating the first one.")
        shelf_item = shelf_items[0]
        print(f"RATE ENDPOINT - ShelfItem ID: {shelf_item.id}, Current rating: {shelf_item.rating}, Current review: '{shelf_item.review}'")

        shelf_item.rating = data.rating
        print(f"RATE ENDPOINT - Set shelf_item.rating to: {shelf_item.rating}")

        if data.review is not None:
            shelf_item.review = data.review
            shelf_item.review_date = datetime.utcnow()
            print(f"RATE ENDPOINT - Set shelf_item.review to '{data.review}' and updated review_date.")

        print(f"RATE ENDPOINT - Attempting to save ShelfItem {shelf_item.id}")
        await shelf_item.save()
        print(f"RATE ENDPOINT - ShelfItem {shelf_item.id} saved successfully.")

        # --- Automatically move item to Finished shelf --- 
        try:
            print(f"RATE ENDPOINT - Attempting to move item {data.media_id} to Finished shelf...")
            await ShelfService.move_item(
                user_id=user_id,
                media_type=media_type_enum,
                media_id=data.media_id,
                new_status=ShelfStatus.FINISHED.value # Use the value of the FINISHED enum member
            )
            print(f"RATE ENDPOINT - Successfully moved/confirmed item {data.media_id} in Finished shelf.")
        except ValueError as move_error: # Catch specific error from move_item if item not found etc.
            # This shouldn't happen if we just found the shelf_item, but good practice
            print(f"RATE ENDPOINT - Warning: Could not move item after rating: {move_error}")
            # Don't raise, as rating itself was successful
        except Exception as move_exception:
            # Catch other potential errors during the move
            print(f"RATE ENDPOINT - Error occurred trying to move item after rating: {move_exception}")
            # Don't raise, log it or handle as needed
        # --- End shelf move logic --- 

        all_ratings = await ShelfItemModel.find({
            "media_id": data.media_id,
            "media_type": media_type_enum,
            "rating": {"$ne": None}
        }).to_list()

        avg_rating = sum(item.rating for item in all_ratings if item.rating is not None) / len(all_ratings) if all_ratings else 0

        return {
            "message": "Rating saved successfully",
            "rating": data.rating,
            "avg_rating": round(avg_rating, 2) if avg_rating else None,
            "total_ratings": len(all_ratings)
        }

    except HTTPException as http_exc:
        print(f"RATE ENDPOINT - HTTPException: {http_exc.status_code} - {http_exc.detail}")
        raise http_exc
    except Exception as e:
        print(f"RATE ENDPOINT - Unexpected Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")

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
                "book": "BOOK",
                "movie": "MOVIE",
                "tv": "TV",
                "article": "ARTICLE"
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
        raise HTTPException(status_code=400, detail=str(e))