import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import certifi
from bson import ObjectId # Import ObjectId
from enum import Enum

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Add project root to path for imports
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Use the actual models now
from app.database.models.user import User
from app.database.models.shelf import ShelfItemModel, ShelfModel
from app.database.schemas.shelf import MediaType, ShelfStatus # Import enums

from config import Settings

async def check_items(user_id_to_check: str):
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

        # Fetch all shelf items for the specific user
        user_items = await ShelfItemModel.find(
            ShelfItemModel.user_id == user_id_to_check
        ).to_list()

        if not user_items:
            print(f"No shelf items found for user {user_id_to_check}")
            return

        print(f"Found {len(user_items)} total items for user {user_id_to_check}.")

        # Filter TV items and get shelf status
        tv_items_details = []
        for item in user_items:
            if item.media_type == MediaType.TV:
                shelf_status = "Shelf Not Found or Error"
                try:
                    # Ensure shelf_id is valid ObjectId before lookup
                    if item.shelf_id and isinstance(item.shelf_id, (str, ObjectId)):
                         shelf_doc_id = ObjectId(item.shelf_id) if isinstance(item.shelf_id, str) else item.shelf_id
                         shelf = await ShelfModel.get(shelf_doc_id)
                         if shelf:
                             # Use shelf.status directly (it should be the enum value)
                             shelf_status = shelf.status.value if isinstance(shelf.status, Enum) else shelf.status
                         else:
                            shelf_status = f"Shelf Not Found (ID: {item.shelf_id})"
                    else:
                        shelf_status = f"Invalid Shelf ID (Value: {item.shelf_id})"

                except Exception as e:
                    shelf_status = f"Error fetching shelf (ID: {item.shelf_id}): {e}"

                tv_items_details.append({
                    "media_id": item.media_id,
                    "media_type": item.media_type,
                    "shelf_status": shelf_status
                })

        if not tv_items_details:
            print(f"No TV items found for user {user_id_to_check}.")
        else:
            print(f"Found {len(tv_items_details)} TV show items:")
            for detail in tv_items_details:
                # Access .value for enum media_type if necessary for printing
                media_type_display = detail['media_type'].value if isinstance(detail['media_type'], Enum) else detail['media_type']
                print(f"  - Media ID: {detail['media_id']}, Media Type: {media_type_display}, Shelf Status: {detail['shelf_status']}")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if client:
            client.close()
            print("Database connection closed.")

if __name__ == "__main__":
    target_user_id = "67cd988d2cf7abfe3da0ae7d" # Jake's ID
    print(f"Checking TV items and shelf status for user: {target_user_id}")
    asyncio.run(check_items(target_user_id))
    print("Script finished.") 