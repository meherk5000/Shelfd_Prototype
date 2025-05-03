from ..database.models.shelf import ShelfModel, ShelfItemModel, MediaType, ShelfType
from ..database.schemas.shelf import MediaType, ShelfType, ShelfStatus
from datetime import datetime
from typing import List, Optional
from beanie.exceptions import DocumentNotFound
from fastapi import HTTPException
from bson import ObjectId

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
        MediaType.TV: [
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
        
        # Convert user_id to string if it's a User object
        if hasattr(user_id, 'id'):
            user_id = str(user_id.id)
        
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
        media_type: MediaType,
        description: Optional[str] = None,
        is_private: bool = False,
        has_collaborators: bool = False
    ) -> ShelfModel:
        """Create a custom shelf"""
        shelf = ShelfModel(
            user_id=user_id,
            name=name,
            media_type=media_type,
            shelf_type=ShelfType.CUSTOM,
            status=ShelfStatus.WANT_TO,
            description=description,
            is_private=is_private,
            has_collaborators=has_collaborators,
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
        """Add an item to a shelf"""
        # Get the shelf and verify ownership
        shelf = await ShelfModel.get(shelf_id)
        if not shelf or shelf.user_id != user_id:
            raise ValueError("Invalid shelf")
        
        # Check if the item is already in the shelf
        if media_id in shelf.items:
            raise ValueError("Item already in shelf")
        
        # Add media_id to shelf's items list
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
            # Get all shelves for this user and media type
            shelves = await ShelfModel.find({
                "user_id": user_id,
                "media_type": media_type
            }).to_list()

            # If no shelves exist, create default ones
            if not shelves:
                shelves = await ShelfService.create_default_shelves(user_id, media_type)

            # Process shelves and fetch their specific items
            processed_shelves = []
            for shelf in shelves:
                # Prepare shelf data structure to return (without modifying original shelf object in loop)
                shelf_data_to_return = {
                    "_id": str(shelf.id),
                    "name": shelf.name,
                    "media_type": shelf.media_type,
                    "shelf_type": shelf.shelf_type,
                    "status": shelf.status,
                    "items": [] # Initialize items list
                }

                # Fetch shelf items BELONGING TO THIS SPECIFIC SHELF
                shelf_items_for_this_shelf = await ShelfItemModel.find({
                    "user_id": user_id,
                    "shelf_id": str(shelf.id) # Filter by the ID of the current shelf
                }).to_list()

                # Convert these specific shelf items to dictionaries
                items_dict = []
                for item in shelf_items_for_this_shelf:
                    item_dict = {
                        "media_id": item.media_id,
                        "title": item.title,
                        "creator": item.creator,
                        "cover_image": item.cover_image,
                        "added_at": item.added_at.isoformat() if item.added_at else None, # Add back isoformat
                        "rating": item.rating # Use rating from item belonging to this shelf
                    }
                    items_dict.append(item_dict)

                # Attach the correctly fetched items to the shelf representation
                shelf_data_to_return["items"] = items_dict
                processed_shelves.append(shelf_data_to_return)

            return processed_shelves # Return list of dicts matching frontend expectation

        except Exception as e:
            # It might be better to re-raise or handle specific exceptions
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Failed to retrieve shelves.")

    @staticmethod
    async def remove_from_shelf(user_id: str, media_id: str, media_type: MediaType) -> bool:
        """Remove an item from a user's shelf(s) and delete associated review if removed from Finished shelf."""
        # --- Import ReviewService inside the method --- 
        from .review_service import ReviewService
        # --- End import ---
        try:
            actual_user_id = str(user_id.id) if hasattr(user_id, 'id') else str(user_id)

            shelf_items_to_delete = await ShelfItemModel.find({
                "user_id": actual_user_id,
                "media_id": media_id,
                "media_type": media_type
            }).to_list()

            if not shelf_items_to_delete:
                raise ValueError(f"Item with ID {media_id} (type: {media_type}) not found in any shelf item record.")

            deleted_count = 0
            review_deleted = False # Flag to track if review deletion was attempted

            for item in shelf_items_to_delete:
                parent_shelf = None
                try:
                    parent_shelf = await ShelfModel.get(item.shelf_id) # Use get for potential None
                except Exception as e:
                     pass # Ensure this pass is correctly indented

                if parent_shelf:
                    # --- Check if it's the Finished shelf and delete review --- 
                    if parent_shelf.shelf_type == ShelfType.DEFAULT and parent_shelf.status == ShelfStatus.FINISHED:
                        if not review_deleted: # Only attempt review deletion once per call
                            try:
                                # Find the review for this user/media
                                # Note: Need to import Review model or use ReviewService.get_user_review
                                from ..database.models.review import Review
                                review_to_delete = await Review.find_one({
                                    "user_id": actual_user_id,
                                    "media_id": media_id,
                                    "media_type": media_type
                                })
                                
                                if review_to_delete:
                                    await ReviewService.delete_review(str(review_to_delete.id), actual_user_id)
                                    review_deleted = True
                                else:
                                    pass # Added pass to avoid empty block after removing print
                            except Exception as review_delete_error:
                                # Log error, but continue shelf removal
                                pass # Added pass for error handling block
                        else:
                            pass # Added pass to avoid empty block after removing print
                    # --- End review deletion check --- 

                    # Remove the media_id from the parent shelf's items list
                    if media_id in parent_shelf.items:
                        original_items = parent_shelf.items.copy()
                        parent_shelf.items = [i for i in parent_shelf.items if i != media_id]
                        await parent_shelf.save()
                    else:
                        pass # Added pass to avoid empty block after removing print
                else:
                    pass # Added pass to avoid empty block after removing print

                # Delete the ShelfItemModel document itself
                await item.delete()
                deleted_count += 1

            return deleted_count > 0

        except ValueError as ve:
            raise ve
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred while removing the item: {str(e)}")

    @staticmethod
    async def get_or_create_shelf(user_id: str, media_type: MediaType, status: str, shelf_type: ShelfType) -> ShelfModel:
        # 1. Validate and convert status string to ShelfStatus enum
        try:
            status_enum = ShelfStatus(status)
        except ValueError:
            raise ValueError(f"Invalid status value provided: {status}")

        # 2. Derive the expected shelf name (primarily for display/creation)
        name = "Unknown Default Shelf" # Default value
        if media_type == MediaType.BOOK:
            if status_enum == ShelfStatus.WANT_TO: name = "Want to Read"
            elif status_enum == ShelfStatus.CURRENT: name = "Currently Reading"
            elif status_enum == ShelfStatus.FINISHED: name = "Finished"
            elif status_enum == ShelfStatus.DNF: name = "Did Not Finish"
            else: raise ValueError(f"Unsupported status '{status}' for Books")
        elif media_type in [MediaType.MOVIE, MediaType.TV]:
            if status_enum == ShelfStatus.WANT_TO: name = "Want to Watch"
            elif status_enum == ShelfStatus.CURRENT: name = "Currently Watching"
            elif status_enum == ShelfStatus.FINISHED: name = "Finished"
            elif status_enum == ShelfStatus.DNF: name = "Did Not Finish"
            else: raise ValueError(f"Unsupported status '{status}' for Movies/TV")
        elif media_type == MediaType.ARTICLE:
            if status_enum == ShelfStatus.SAVED: name = "Saved"
            elif status_enum == ShelfStatus.FINISHED: name = "Finished"
            else: raise ValueError(f"Unsupported status '{status}' for Articles")
        else:
            raise ValueError(f"Unsupported media type: {media_type}")

        # 3. Try to find existing shelf (Query by user, type, AND status enum)
        shelf = await ShelfModel.find_one({
            "user_id": user_id,
            "media_type": media_type,
            "status": status_enum,
            "shelf_type": ShelfType.DEFAULT # Ensure we only match default shelves
        })

        if shelf:
            # Found existing shelf
            return shelf # Return the found shelf

        # 4. Create new shelf if not found
        new_shelf_doc = ShelfModel(
            user_id=user_id,
            name=name, # Use the derived name
            media_type=media_type,
            status=status_enum, # Use the ENUM value
            shelf_type=shelf_type, # Should be ShelfType.DEFAULT
            items=[]
        )
        created_shelf = await new_shelf_doc.create()
        return created_shelf

    @staticmethod
    async def get_shelf_by_status(user_id: str, media_type: MediaType, status: str) -> Optional[ShelfModel]:
        """Finds a default shelf for a user based on media type and status string."""
        # This relies on default shelves having a specific naming convention or status mapping
        # We can use the existing get_or_create_shelf logic, but prevent creation if not found
        try:
            # Map status string to ShelfStatus enum if needed (assuming status is already the enum string like 'want_to')
            status_enum = ShelfStatus(status)
            shelf = await ShelfModel.find_one({
                "user_id": user_id,
                "media_type": media_type,
                "status": status_enum, # Query by the status enum value
                "shelf_type": ShelfType.DEFAULT
            })
            return shelf
        except ValueError: # Invalid status string
            return None
        except Exception as e:
            print(f"Error finding shelf by status: {e}")
            return None

    @staticmethod
    async def move_item(
        user_id: str,
        media_type: MediaType,
        media_id: str,
        new_status: str, # e.g., "current", "finished"
    ):
        """Moves an item between default shelves based on the new status."""
        # 1. Find the existing shelf item in any default shelf
        shelf_item = await ShelfItemModel.find_one({
            "user_id": user_id,
            "media_id": media_id,
            "media_type": media_type,
             # Ensure we only find items associated with a DEFAULT shelf
            "shelf_id": {"$in": [
                str(s.id) for s in await ShelfModel.find({
                    "user_id": user_id,
                    "media_type": media_type,
                    "shelf_type": ShelfType.DEFAULT
                }).to_list()
            ]}
        })

        if not shelf_item:
            raise ValueError(f"Item {media_id} not found in any default shelf for user {user_id}.")

        # 2. Find the old shelf
        try:
            old_shelf = await ShelfModel.get(shelf_item.shelf_id)
            if not old_shelf:
                 raise DocumentNotFound # Should ideally exist if shelf_item was found
        except DocumentNotFound:
             raise ValueError(f"Old shelf {shelf_item.shelf_id} not found for item {media_id}.")

        # 3. Check if already in the target status
        if old_shelf.status.value == new_status:
            return shelf_item # Return the item as no move occurred

        # 4. Find or create the new target default shelf based on status
        # Use get_or_create_shelf which handles naming conventions
        try:
            new_shelf = await ShelfService.get_or_create_shelf(user_id, media_type, new_status, ShelfType.DEFAULT)
        except ValueError as e: # Handle if get_or_create_shelf fails for status
            raise ValueError(f"Could not determine target shelf for status '{new_status}': {e}")

        # 5. Update Old Shelf (remove item)
        if media_id in old_shelf.items:
            old_shelf.items.remove(media_id)
            await old_shelf.save()
        else:
            pass # Added pass for consistency

        # 6. Update New Shelf (add item)
        if media_id not in new_shelf.items:
            new_shelf.items.append(media_id)
            await new_shelf.save()
        else:
            pass # Added pass for consistency

        # 7. Update Shelf Item (change shelf_id)
        shelf_item.shelf_id = str(new_shelf.id)
        await shelf_item.save()

        return shelf_item # Return the updated shelf item

    @staticmethod
    async def add_item_to_shelf(
        user_id: str,
        media_type: MediaType,
        media_id: str,
        status: str, # e.g., "want_to", "current"
        title: str,
        shelf_type: ShelfType, # Should be DEFAULT here
        image_url: Optional[str] = None,
        creator: Optional[str] = None
    ) -> ShelfItemModel:
        """Adds an item to the correct default shelf based on status."""
        # 1. Find or create the target default shelf
        target_shelf = await ShelfService.get_or_create_shelf(user_id, media_type, status, ShelfType.DEFAULT)
        
        # 2. Check if item ALREADY exists in this specific target shelf's items list
        # (Should ideally be redundant if route handler logic is correct, but good failsafe)
        if media_id in target_shelf.items:
            # If already in list, find the existing ShelfItemModel instead of creating a new one
            existing_item = await ShelfItemModel.find_one({
                "user_id": user_id,
                "shelf_id": str(target_shelf.id),
                "media_id": media_id
            })
            if existing_item:
                return existing_item
            else:
                 # Discrepancy: In items list but no ShelfItemModel? Log and proceed to create.
                 pass # Added pass to avoid empty block after removing print

        # 3. Add item to shelf's list if not already there
        if media_id not in target_shelf.items:
            target_shelf.items.append(media_id)
            await target_shelf.save()
            pass # Added pass to avoid empty block after removing print

        # 4. Create the ShelfItemModel linking item to this shelf
        # Check if a shelf item exists for this user/media_id *at all* first? 
        # No, the route handler already determined it wasn't in *any* default shelf.
        shelf_item = ShelfItemModel(
            user_id=user_id,
            shelf_id=str(target_shelf.id),
            media_id=media_id,
            media_type=media_type,
            title=title,
            creator=creator,
            cover_image=image_url
        )
        await shelf_item.create()
        return shelf_item