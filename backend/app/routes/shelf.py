from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from ..database.models.shelf import ShelfModel, ShelfItemModel, MediaType, ShelfType
from ..services.shelf_service import ShelfService
from ..services.auth import get_current_user, oauth2_scheme
from pydantic import BaseModel

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
    media_type: MediaType,
    token: str = Depends(oauth2_scheme)
):
    try:
        # Debug logging
        print(f"Debug - Received media_type: {media_type}")
        print(f"Debug - Valid media types: {[m.value for m in MediaType]}")
        
        user_id = await get_current_user(token)
        shelves = await ShelfService.get_user_shelves(user_id, media_type)
        
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
    shelf_item: dict,
    token: str = Depends(oauth2_scheme)
):
    try:
        user_id = await get_current_user(token)
        
        # Validate required fields are present
        if "shelf_id" in shelf_item:
            # Adding to a custom shelf
            required_fields = ["media_type", "media_id", "title", "shelf_id"]
        else:
            # Adding to a default shelf
            required_fields = ["media_type", "media_id", "status", "title", "shelf_type"]
            
        for field in required_fields:
            if field not in shelf_item or not shelf_item[field]:  # Check if field is empty
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing or empty required field: {field}"
                )
        
        try:
            media_type_str = shelf_item["media_type"].upper()
            print("Debug - Media Type String:", media_type_str)  # Add debug logging
            media_type = MediaType[media_type_str]
            print("Debug - Converted Media Type:", media_type)  # Add debug logging
            
            if "shelf_id" in shelf_item:
                # Adding to a custom shelf
                result = await ShelfService.add_to_shelf(
                    user_id=user_id,
                    shelf_id=shelf_item["shelf_id"],
                    media_id=shelf_item["media_id"],
                    media_type=media_type,
                    title=shelf_item["title"],
                    creator=shelf_item.get("creator"),
                    cover_image=shelf_item.get("image_url")
                )
            else:
                # Adding to a default shelf
                shelf_type_str = shelf_item["shelf_type"]
                print("Debug - Shelf Type String:", shelf_type_str)  # Add debug logging
                shelf_type = ShelfType[shelf_type_str]
                print("Debug - Converted Shelf Type:", shelf_type)  # Add debug logging
                
                result = await ShelfService.add_item_to_shelf(
                    user_id=user_id,
                    media_type=media_type,
                    media_id=shelf_item["media_id"],
                    status=shelf_item["status"],
                    title=shelf_item["title"],
                    shelf_type=shelf_type,
                    image_url=shelf_item.get("image_url"),
                    creator=shelf_item.get("creator")
                )
            return result
        except KeyError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid enum value: {str(e)}"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Value error: {str(e)}"
            )
    except Exception as e:
        print("Debug - Exception:", str(e))  # Add debug logging
        raise HTTPException(
            status_code=400,
            detail=f"Error processing request: {str(e)}"
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
                "tv-shows": "TV_SHOW",
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
        user_id = await get_current_user(token)
        
        # Convert media type string to enum
        media_type_map = {
            "Books": MediaType.BOOK,
            "Movies": MediaType.MOVIE,
            "TV Shows": MediaType.TV_SHOW,
            "Articles": MediaType.ARTICLE
        }
        
        media_type = media_type_map.get(data.media_type)
        if not media_type:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid media type: {data.media_type}"
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
                "media_type": shelf.media_type,
                "description": shelf.description,
                "is_private": shelf.is_private,
                "has_collaborators": shelf.has_collaborators,
                "items": []
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))