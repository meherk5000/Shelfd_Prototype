import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import certifi

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Add project root to path for imports
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Import the necessary models and the MediaType enum
from app.database.models.user import User # Needed for init_beanie
from app.database.models.shelf import ShelfItemModel, ShelfModel # Target ShelfModel now
from app.database.schemas.shelf import MediaType # Ensure MediaType is imported

from config import Settings

async def migrate_shelf_media_types():
    settings = Settings()
    client = None # Initialize client to None
    try:
        # Initialize Beanie with all necessary models
        client = AsyncIOMotorClient(
            settings.mongodb_url,
            tlsCAFile=certifi.where()
        )
        await init_beanie(
            database=client[settings.MONGODB_NAME],
            # Add ShelfModel here
            document_models=[User, ShelfItemModel, ShelfModel]
        )
        print("Successfully connected to database and initialized Beanie.")

        # Find ShelfModel documents with the incorrect media_type
        incorrect_value = "tv_show" # Target the underscore version
        correct_media_type = MediaType.TV

        incorrect_shelves = ShelfModel.find({"media_type": incorrect_value})
        count = await incorrect_shelves.count()

        if count == 0:
            print(f"No shelves found with media_type '{incorrect_value}'. Migration not needed.")
            return

        print(f"Found {count} shelves with media_type '{incorrect_value}'. Starting migration...")

        # Update the ShelfModel documents
        result = await ShelfModel.find({"media_type": incorrect_value}).update({
            "$set": {"media_type": correct_media_type}
        })

        updated_count = result.modified_count

        print(f"Shelf migration complete. Updated {updated_count} documents.")
        if updated_count != count:
             print(f"Warning: Initial count was {count}, but updated count is {updated_count}. Please check database.")

    except Exception as e:
        print(f"An error occurred during shelf migration: {e}")
    finally:
        # Ensure the client connection is closed
        if client:
            client.close()
            print("Database connection closed.")

if __name__ == "__main__":
    print("Running Shelf media type migration script...")
    asyncio.run(migrate_shelf_media_types())
    print("Shelf migration script finished.") 