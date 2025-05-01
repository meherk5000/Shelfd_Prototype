# backend/scripts/find_duplicate_shelves.py
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import certifi
from collections import defaultdict
from datetime import datetime # Import datetime

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId # Import PydanticObjectId

# Import the necessary models
from app.database.models.user import User
from app.database.models.shelf import ShelfItemModel, ShelfModel
from app.database.schemas.shelf import MediaType # Import the enum

from config import Settings

async def find_duplicates(user_id_to_check: str):
    settings = Settings()
    client = None
    try:
        # Initialize Beanie
        client = AsyncIOMotorClient(
            settings.mongodb_url,
            tlsCAFile=certifi.where()
        )
        await init_beanie(
            database=client[settings.MONGODB_NAME],
            document_models=[User, ShelfItemModel, ShelfModel]
        )
        print("Connected to database.")

        # No need to convert ID for direct string comparison
        # user_obj_id = PydanticObjectId(user_id_to_check)

        # Fetch all shelves for the specific user using the user_id field directly
        user_shelves = await ShelfModel.find(
             ShelfModel.user_id == user_id_to_check # <-- Correct field for query
        ).to_list()

        if not user_shelves:
            print(f"No shelves found for user {user_id_to_check}")
            return

        print(f"Found {len(user_shelves)} total shelves for user {user_id_to_check}.")

        # Group shelves by (name, media_type)
        grouped_shelves = defaultdict(list)
        for shelf in user_shelves:
            # Ensure media_type is the string value for grouping
            media_type_str = shelf.media_type.value if hasattr(shelf.media_type, 'value') else str(shelf.media_type)
            grouped_shelves[(shelf.name, media_type_str)].append(shelf)

        # Identify and process duplicate groups
        found_duplicates = False
        print("\n--- Checking for Duplicate Shelves (Same Name and Media Type) ---")
        for (name, media_type), shelves in grouped_shelves.items():
            if len(shelves) > 1:
                found_duplicates = True
                print(f"\nDuplicate Group Found: Name='{name}', Type='{media_type}' ({len(shelves)} shelves)")
                print("-" * 40)
                # Sort shelves within the group, e.g., by creation date (oldest first)
                shelves.sort(key=lambda s: s.created_at if s.created_at else datetime.min)
                for i, shelf in enumerate(shelves):
                    # Count items associated with this shelf
                    shelf_id_str = str(shelf.id) # Convert shelf ObjectId to string for query
                    item_count = await ShelfItemModel.find(ShelfItemModel.shelf_id == shelf_id_str).count() # Compare string to string
                    created_date = shelf.created_at.strftime('%Y-%m-%d %H:%M:%S') if shelf.created_at else "Unknown"
                    print(f"  Shelf {i+1}:")
                    print(f"    _id: {shelf.id}")
                    print(f"    Created At: {created_date}")
                    print(f"    Item Count: {item_count}")
                    # Add status for context, handling potential Enum
                    shelf_status_val = shelf.status.value if hasattr(shelf.status, 'value') else shelf.status
                    print(f"    (Status: {shelf_status_val})")

        if not found_duplicates:
            print("\nNo duplicate shelves found for this user.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if client:
            client.close()
            print("Database connection closed.")

if __name__ == "__main__":
    target_user_id = "67cd988d2cf7abfe3da0ae7d" # Jake's ID
    print(f"Finding duplicate shelves for user: {target_user_id}")
    asyncio.run(find_duplicates(target_user_id))
    print("Duplicate check script finished.") 