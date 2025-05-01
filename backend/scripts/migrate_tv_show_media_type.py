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
from app.database.models.shelf import ShelfItemModel, ShelfModel
from app.database.schemas.shelf import MediaType # Ensure MediaType is imported

from config import Settings

async def migrate_media_types():
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
            # Ensure all models used in ShelfItemModel relations are included if necessary
            # Add other models here if ShelfItemModel links to them and init_beanie needs them
            document_models=[User, ShelfItemModel, ShelfModel]
        )
        print("Successfully connected to database and initialized Beanie.")

        # Find documents with the incorrect media_type (underscore version)
        incorrect_value = "tv_show" # <--- Target the underscore version now
        correct_media_type = MediaType.TV

        incorrect_items = ShelfItemModel.find({"media_type": incorrect_value})
        count = await incorrect_items.count()

        if count == 0:
            print(f"No shelf items found with media_type '{incorrect_value}'. Migration not needed.")
            return

        print(f"Found {count} shelf items with media_type '{incorrect_value}'. Starting migration...")

        # Update the documents
        result = await ShelfItemModel.find({"media_type": incorrect_value}).update({
            "$set": {"media_type": correct_media_type}
        })

        # Motor/Beanie update result structure might vary slightly, check attributes
        # Usually has modified_count or similar
        updated_count = result.modified_count

        print(f"Migration complete. Updated {updated_count} documents.")
        if updated_count != count:
             print(f"Warning: Initial count was {count}, but updated count is {updated_count}. Please check database.")

    except Exception as e:
        print(f"An error occurred during migration: {e}")
    finally:
        # Ensure the client connection is closed
        if client:
            client.close()
            print("Database connection closed.")

if __name__ == "__main__":
    print("Running media type migration script...")
    asyncio.run(migrate_media_types())
    print("Migration script finished.") 