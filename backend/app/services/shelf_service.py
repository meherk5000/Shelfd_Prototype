from ..database.models.shelf import ShelfModel, ShelfItemModel, MediaType, ShelfType
from ..database.schemas.shelf import MediaType, ShelfType, ShelfStatus
from datetime import datetime
from typing import List, Optional

class ShelfService:
    DEFAULT_SHELVES = {
        MediaType.BOOK: [
            ("Want to Read", ShelfStatus.WANT_TO),
            ("Currently Reading", ShelfStatus.CURRENT),
            ("Finished", ShelfStatus.FINISHED),
            ("Did Not Finish", ShelfStatus.DNF)
        ],
        MediaType.MOVIE: [
            ("Want to Watch", ShelfStatus.WANT_TO),
            ("Currently Watching", ShelfStatus.CURRENT),
            ("Finished", ShelfStatus.FINISHED),
            ("Did Not Finish", ShelfStatus.DNF)
        ],
        MediaType.TV_SHOW: [
            ("Want to Watch", ShelfStatus.WANT_TO),
            ("Currently Watching", ShelfStatus.CURRENT),
            ("Finished", ShelfStatus.FINISHED),
            ("Did Not Finish", ShelfStatus.DNF)
        ],
        MediaType.ARTICLE: [
            ("Saved", ShelfStatus.SAVED),
            ("Finished", ShelfStatus.FINISHED)
        ]
    }

    @staticmethod
    async def create_default_shelves(user_id: str, media_type: MediaType) -> List[ShelfModel]:
        default_shelves = []
        
        if media_type == MediaType.ARTICLE:
            statuses = ["saved", "finished"]
            names = ["Saved", "Finished"]
        else:
            action = "Read" if media_type == MediaType.BOOK else "Watch"
            statuses = ["want_to", "current", "finished", "did_not_finish"]
            names = [
                f"Want to {action}",
                f"Currently {action}ing",
                "Finished",
                "Did not Finish"
            ]
        
        for status, name in zip(statuses, names):
            shelf = ShelfModel(
                user_id=user_id,
                name=name,
                media_type=media_type,
                status=status,
                shelf_type=ShelfType.DEFAULT
            )
            await shelf.save()
            default_shelves.append(shelf)
        
        return default_shelves

    @staticmethod
    async def create_custom_shelf(
        user_id: str,
        name: str,
        media_type: MediaType
    ) -> ShelfModel:
        """Create a custom shelf"""
        shelf = ShelfModel(
            user_id=user_id,
            name=name,
            media_type=media_type,
            shelf_type=ShelfType.CUSTOM,
            status=ShelfStatus.WANT_TO,
            items=[]
        )
        return await shelf.insert()

    @staticmethod
    async def add_to_shelf(
        user_id: str,
        shelf_id: str,
        media_id: str,
        media_type: MediaType,
        title: str,
        creator: Optional[str] = None,
        cover_image: Optional[str] = None
    ) -> ShelfItemModel:
        # Add media_id to shelf's items list
        shelf = await ShelfModel.get(shelf_id)
        if not shelf or shelf.user_id != user_id:
            raise ValueError("Invalid shelf")
        
        if media_id not in shelf.items:
            shelf.items.append(media_id)
            await shelf.save()
        
        # Create shelf item
        shelf_item = ShelfItemModel(
            user_id=user_id,
            shelf_id=str(shelf_id),  # Convert ObjectId to string
            media_id=media_id,
            media_type=media_type,
            title=title,
            creator=creator,
            cover_image=cover_image
        )
        return await shelf_item.create()

    @staticmethod
    async def get_user_shelves(user_id: str, media_type: MediaType) -> List[ShelfModel]:
        try:
            # Debug the query parameters
            print(f"Debug - Querying shelves for user {user_id} and media type {media_type}")
            
            # Get all shelves for this user and media type
            shelves = await ShelfModel.find({
                "user_id": user_id,
                "media_type": media_type
            }).to_list()
            
            # If no shelves exist, create default ones
            if not shelves:
                print("Debug - No shelves found, creating defaults")
                shelves = await ShelfService.create_default_shelves(user_id, media_type)
            
            # Convert the raw dictionaries to ShelfModel instances
            shelf_models = []
            for shelf_dict in shelves:
                if isinstance(shelf_dict, dict):
                    shelf_model = ShelfModel(**shelf_dict)
                    shelf_models.append(shelf_model)
                else:
                    shelf_models.append(shelf_dict)
            
            print(f"Debug - Returning {len(shelf_models)} shelves")
            return shelf_models
            
        except Exception as e:
            print(f"Debug - Error in get_user_shelves: {str(e)}")
            raise e

    @staticmethod
    async def remove_from_shelf(user_id: str, media_id: str, shelf_type: MediaType) -> bool:
        """Remove an item from a user's shelf"""
        try:
            print(f"Debug - Looking for shelf with: user_id={user_id}, media_type={shelf_type}, media_id={media_id}")
            
            # First find the shelf that contains this item
            shelf = await ShelfModel.find_one({
                "user_id": user_id,
                "media_type": shelf_type,
                "items": media_id
            })
            
            print(f"Debug - Found shelf: {shelf}")
            
            if not shelf:
                raise ValueError(f"Item with ID {media_id} not found in any shelf")
            
            # Remove the item from the shelf's items array
            original_items = shelf.items.copy()
            shelf.items = [item for item in shelf.items if item != media_id]
            print(f"Debug - Items before: {original_items}")
            print(f"Debug - Items after: {shelf.items}")
            
            await shelf.save()
            print("Debug - Saved shelf changes")
            
            # Also remove the shelf item if it exists
            shelf_items = await ShelfItemModel.find({
                "user_id": user_id,
                "media_id": media_id
            }).to_list()
            
            print(f"Debug - Found {len(shelf_items)} shelf items to delete")
            
            for item in shelf_items:
                await item.delete()
                print(f"Debug - Deleted shelf item: {item}")
            
            return True
        except Exception as e:
            print(f"Debug - Error in remove_from_shelf: {str(e)}")
            raise e

    @staticmethod
    async def get_or_create_shelf(user_id: str, media_type: MediaType, status: str, shelf_type: ShelfType) -> ShelfModel:
        # Try to find existing shelf
        shelf = await ShelfModel.find_one({
            "user_id": user_id,
            "media_type": media_type,
            "status": status
        })
        
        if shelf:
            # Ensure the ID is converted to string
            shelf.id = str(shelf.id)
            return shelf
        
        # Create new shelf if not found
        shelf = ShelfModel(
            user_id=user_id,
            media_type=media_type,
            status=status,
            shelf_type=shelf_type,
            items=[]
        )
        created_shelf = await shelf.create()
        created_shelf.id = str(created_shelf.id)
        return created_shelf

    @staticmethod
    async def add_item_to_shelf(
        user_id: str,
        media_type: MediaType,
        media_id: str,
        status: str,
        title: str,
        shelf_type: ShelfType,
        image_url: Optional[str] = None,
        creator: Optional[str] = None
    ) -> ShelfItemModel:
        # Get or create the appropriate shelf
        shelf = await ShelfService.get_or_create_shelf(
            user_id=user_id,
            media_type=media_type,
            status=status,
            shelf_type=shelf_type
        )
        
        # Add the item to the shelf
        return await ShelfService.add_to_shelf(
            user_id=user_id,
            shelf_id=shelf.id,
            media_id=media_id,
            media_type=media_type,
            title=title,
            creator=creator,
            cover_image=image_url
        )