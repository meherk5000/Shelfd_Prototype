"""
ShelfService - Core service handling shelf management for the application.

This service manages the user's media shelves (e.g., "Want to Read", "Currently Reading").
It provides methods to create, retrieve, and modify shelves and the items stored within them.
Shelves are a fundamental feature of the app, allowing users to organize and track their media consumption.
"""

from ..database.models.shelf import ShelfModel, ShelfItemModel, MediaType, ShelfType
from ..database.schemas.shelf import MediaType, ShelfType, ShelfStatus
from datetime import datetime
from typing import List, Optional
from beanie.exceptions import DocumentNotFound
from fastapi import HTTPException
from bson import ObjectId

class ShelfService:
    """
    Service class for managing user shelves and shelf items.
    
    Shelves are collections of media items (books, movies, TV shows, articles) that users 
    can organize based on their consumption status (want to read/watch, currently reading/watching, etc.).
    
    The system supports two types of shelves:
    1. Default shelves - System-created shelves for standard statuses, like "Want to Read"
    2. Custom shelves - User-created shelves for personal organization
    
    Each media type has specific default shelves appropriate to that media type.
    """
    
    # Define the default shelves for each media type
    # This maps media types to lists of (shelf name, status) tuples
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
        """
        Create the default set of shelves for a user based on the media type.
        
        This is typically called when a user first accesses shelves for a particular media type,
        or when a new user account is created.
        
        Args:
            user_id: The ID of the user to create shelves for
            media_type: The type of media (book, movie, TV, article) for these shelves
            
        Returns:
            A list of created ShelfModel objects
        """
        default_shelves = []
        
        # Convert user_id to string if it's a User object
        if hasattr(user_id, 'id'):
            user_id = str(user_id.id)
        
        # Set appropriate statuses and names based on media type
        if media_type == MediaType.ARTICLE:
            statuses = ["saved", "finished"]
            names = ["Saved", "Finished"]
        else:
            # Use appropriate verb based on media type (Read for books, Watch for movies/TV)
            action = "Read" if media_type == MediaType.BOOK else "Watch"
            statuses = ["want_to", "current", "finished", "did_not_finish"]
            names = [
                f"Want to {action}",
                f"Currently {action}ing",
                "Finished",
                "Did not Finish"
            ]
        
        # Create and save each default shelf
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
        """
        Create a custom shelf for a user.
        
        Custom shelves allow users to organize their media beyond the standard statuses.
        For example, a user might create a "Fantasy Books" or "Oscar Winners" shelf.
        
        Args:
            user_id: ID of the user creating the shelf
            name: Name of the custom shelf
            media_type: Type of media the shelf will contain
            description: Optional description of the shelf
            is_private: Whether the shelf is private (not visible to other users)
            has_collaborators: Whether the shelf allows collaborators
            
        Returns:
            The created ShelfModel object
        """
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
        """
        Add a specific media item to a specified shelf.
        
        This is used when adding to a specific custom shelf, rather than a default shelf.
        
        Args:
            user_id: ID of the user who owns the shelf
            shelf_id: ID of the shelf to add the item to
            media_id: ID of the media item (e.g., book ID, movie ID)
            media_type: Type of media being added
            title: Title of the media item
            creator: Optional creator of the media (author, director)
            cover_image: Optional URL to cover image
            
        Returns:
            The created ShelfItemModel object
            
        Raises:
            ValueError: If the shelf is invalid or item already exists in shelf
        """
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
        """
        Get all shelves for a user for a specific media type.
        
        This retrieves both default and custom shelves. If no shelves exist yet,
        default shelves will be created automatically.
        
        Args:
            user_id: ID of the user whose shelves to retrieve
            media_type: Type of media shelves to retrieve
            
        Returns:
            List of shelf objects with their items
            
        Raises:
            HTTPException: If there's an error retrieving shelves
        """
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
        """
        Remove a media item from all of a user's shelves of a specific media type.
        
        This also deletes any associated review if the item is being removed from a "Finished" shelf.
        
        Args:
            user_id: ID of the user
            media_id: ID of the media item to remove
            media_type: Type of media being removed
            
        Returns:
            True if item was removed successfully, False otherwise
            
        Raises:
            ValueError: If the item is not found in any shelf
            HTTPException: For unexpected errors
        """
        # --- Import ReviewService inside the method --- 
        from .review_service import ReviewService
        # --- End import ---
        try:
            actual_user_id = str(user_id.id) if hasattr(user_id, 'id') else str(user_id)

            # Find all shelf items for this user and media
            shelf_items_to_delete = await ShelfItemModel.find({
                "user_id": actual_user_id,
                "media_id": media_id,
                "media_type": media_type
            }).to_list()

            if not shelf_items_to_delete:
                raise ValueError(f"Item with ID {media_id} (type: {media_type}) not found in any shelf item record.")

            deleted_count = 0
            review_deleted = False # Flag to track if review deletion was attempted

            # Process each shelf item
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
        """
        Get an existing shelf or create a new one if it doesn't exist.
        
        This is primarily used for ensuring default shelves exist when needed.
        
        Args:
            user_id: ID of the user
            media_type: Type of media for the shelf
            status: Status string (e.g., "want_to", "current")
            shelf_type: Type of shelf (typically DEFAULT)
            
        Returns:
            The found or created ShelfModel
            
        Raises:
            ValueError: If the status or media type is invalid
        """
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
        """
        Finds a default shelf for a user based on media type and status string.
        
        Args:
            user_id: ID of the user
            media_type: Type of media
            status: Status string (e.g., "want_to", "current")
            
        Returns:
            The found ShelfModel or None if not found
        """
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
        to_status: ShelfStatus, # Use ShelfStatus enum for type safety
    ):
        """
        Moves an item between default shelves based on the new status.
        
        This is used when a user changes the status of a media item, for example
        moving a book from "Want to Read" to "Currently Reading".
        
        Args:
            user_id: ID of the user
            media_type: Type of media being moved
            media_id: ID of the media item
            to_status: New status enum for the item
            
        Returns:
            The updated ShelfItemModel
            
        Raises:
            ValueError: If the item is not found or shelves cannot be determined
        """
        # 1. Find the existing shelf item in any default shelf
        shelf_item = await ShelfItemModel.find_one({
            "user_id": user_id,
            "media_id": media_id,
            "media_type": media_type,
        })
        
        if not shelf_item:
            raise ValueError(f"Item not found in any shelf: {media_id}")
        
        # 2. Get the source (current) shelf 
        try:
            src_shelf = await ShelfModel.get(shelf_item.shelf_id)
            if not src_shelf:
                raise ValueError(f"Source shelf not found for item: {media_id}")
        except Exception as e:
            raise ValueError(f"Error getting source shelf: {str(e)}")
        
        # 3. Find or create the target shelf based on the new status
        try:
            # Get target shelf by status or create if needed
            target_shelf = await ShelfService.get_or_create_shelf(
                user_id=user_id,
                media_type=media_type,
                status=to_status.value, # Convert enum to string value
                shelf_type=ShelfType.DEFAULT
            )
        except Exception as e:
            raise ValueError(f"Error getting target shelf: {str(e)}")
        
        # 4. Only proceed if the shelves are different
        if src_shelf.id == target_shelf.id:
            # Item is already in the correct shelf, no need to move
            return shelf_item
        
        # 5. Update the shelf_item with new shelf_id
        shelf_item.shelf_id = str(target_shelf.id)
        await shelf_item.save()
        
        # 6. Update the source and target shelf item lists
        # Remove from source shelf's items list
        if media_id in src_shelf.items:
            src_shelf.items = [i for i in src_shelf.items if i != media_id]
            await src_shelf.save()
        
        # Add to target shelf's items list if not already there
        if media_id not in target_shelf.items:
            target_shelf.items.append(media_id)
            await target_shelf.save()
        
        return shelf_item

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
        """
        Add a media item to a default shelf based on its status.
        
        This is the main method used when a user adds an item to their library.
        It handles finding or creating the appropriate default shelf, and creating
        the shelf item.
        
        Args:
            user_id: ID of the user
            media_type: Type of media being added
            media_id: ID of the media item
            status: Status string (e.g., "want_to", "current")
            title: Title of the media item
            shelf_type: Type of shelf (should be DEFAULT)
            image_url: Optional URL to cover image
            creator: Optional creator of the media (author, director)
            
        Returns:
            The created ShelfItemModel
            
        Raises:
            ValueError: If the shelf cannot be found or created
        """
        # 1. Check if the item already exists in any shelf
        existing_item = await ShelfItemModel.find_one({
            "user_id": user_id,
            "media_id": media_id,
            "media_type": media_type
        })
        
        if existing_item:
            # Item exists, move it to the correct shelf instead of adding it again
            try:
                status_enum = ShelfStatus(status)
                await ShelfService.move_item(user_id, media_type, media_id, status_enum)
                return existing_item
            except Exception as e:
                raise ValueError(f"Error moving existing item: {str(e)}")
        
        # 2. Get or create the appropriate default shelf
        shelf = await ShelfService.get_or_create_shelf(
            user_id=user_id,
            media_type=media_type,
            status=status,
            shelf_type=shelf_type
        )
        
        # 3. Add media_id to shelf's items list
        if media_id not in shelf.items:
            shelf.items.append(media_id)
            await shelf.save()
        
        # 4. Create and save the shelf item
        shelf_item = ShelfItemModel(
            user_id=user_id,
            shelf_id=str(shelf.id),
            media_id=media_id,
            media_type=media_type,
            title=title,
            cover_image=image_url,
            creator=creator
        )
        
        await shelf_item.save()
        return shelf_item

    @staticmethod
    async def get_shelf_items_by_status(
        user_id: str,
        media_type: MediaType,
        status: str
    ) -> List[dict]:
        """
        Get all items from a shelf with a specific status.
        
        This is used to retrieve items from a default shelf, such as
        all books in the "Currently Reading" shelf.
        
        Args:
            user_id: ID of the user
            media_type: Type of media to retrieve
            status: Status string (e.g., "want_to", "current")
            
        Returns:
            List of shelf items in dictionary format
            
        Raises:
            ValueError: If the status is invalid
        """
        # 1. Validate and convert the status string
        try:
            status_enum = ShelfStatus(status)
        except ValueError:
            raise ValueError(f"Invalid status value: {status}")
        
        # 2. Get the shelf for this status
        shelf = await ShelfService.get_shelf_by_status(user_id, media_type, status)
        if not shelf:
            # No shelf found, return empty list
            return []
        
        # 3. Get all items for this shelf
        items = await ShelfItemModel.find({
            "user_id": user_id,
            "shelf_id": str(shelf.id)
        }).to_list()
        
        # 4. Convert to dictionary format
        items_dict = []
        for item in items:
            item_dict = {
                "id": str(item.id),
                "media_id": item.media_id,
                "media_type": item.media_type,
                "title": item.title,
                "creator": item.creator,
                "cover_image": item.cover_image,
                "added_at": item.added_at.isoformat() if item.added_at else None,
                "rating": item.rating
            }
            items_dict.append(item_dict)
        
        return items_dict

    @staticmethod
    async def update_shelf_item(
        user_id: str,
        item_id: str,
        updates: dict
    ) -> Optional[ShelfItemModel]:
        """
        Update a shelf item with new data.
        
        This allows changing metadata for an item, such as rating, notes, etc.
        
        Args:
            user_id: ID of the user who owns the item
            item_id: ID of the shelf item to update
            updates: Dictionary of fields to update
            
        Returns:
            The updated ShelfItemModel or None if not found
            
        Raises:
            ValueError: If the item doesn't exist or doesn't belong to the user
        """
        # Ensure user_id is a string
        if hasattr(user_id, 'id'):
            user_id = str(user_id.id)
        
        # Find the item and verify ownership
        try:
            item = await ShelfItemModel.get(item_id)
            if not item or item.user_id != user_id:
                return None
        except Exception:
            return None
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(item, key):
                setattr(item, key, value)
        
        # Save changes
        await item.save()
        return item