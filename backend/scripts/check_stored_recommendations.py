# backend/scripts/check_stored_recommendations.py
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import certifi
from enum import Enum

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Document # Import Document for placeholder

# Import the actual models if possible, otherwise use placeholders carefully
try:
    from app.database.models.user import User
    from app.database.models.shelf import ShelfItemModel, ShelfModel # Needed for init_beanie context
    from app.database.models.recommendation import Recommendation # The target model
    from app.database.schemas.shelf import MediaType # Import the enum
except ImportError:
    print("Warning: Could not import full models, using placeholders.")
    # Define necessary placeholders ONLY if imports fail
    class User(Document): pass
    class ShelfItemModel(Document): pass
    class ShelfModel(Document): pass
    class Recommendation(Document):
        user_id: str
        media_type: str # Assuming string storage or handle enum conversion
        title: str
        class Settings:
            name = "recommendations" # Crucial: specify collection name
    # Define MediaType placeholder ONLY if needed
    class MediaType(Enum):
        TV = "tv"
        MOVIE = "movie"
        BOOK = "book"
        ARTICLE = "article"


from config import Settings

async def check_recs(user_id_to_check: str, target_media_type: MediaType):
    settings = Settings()
    client = None
    try:
        # Initialize Beanie
        client = AsyncIOMotorClient(
            settings.mongodb_url,
            tlsCAFile=certifi.where()
        )
        # Include ALL models beanie might need, especially relations
        await init_beanie(
            database=client[settings.MONGODB_NAME],
            document_models=[User, ShelfItemModel, ShelfModel, Recommendation]
        )
        print("Connected to database.")

        # Fetch recommendations for the user and media type
        # Use the enum value for the query
        tv_recs = await Recommendation.find(
            Recommendation.user_id == user_id_to_check,
            Recommendation.media_type == target_media_type
        ).to_list()

        if not tv_recs:
            print(f"No recommendations found for user {user_id_to_check} with media_type '{target_media_type.value}'.")
        else:
            print(f"Found {len(tv_recs)} recommendations for user {user_id_to_check} with media_type '{target_media_type.value}':")
            for i, rec in enumerate(tv_recs):
                # Accessing media_type directly, assuming it matches the enum value or is stored as string 'tv'
                media_type_val = rec.media_type.value if isinstance(rec.media_type, Enum) else rec.media_type
                print(f"  {i+1}. Title: {rec.title} (Type: {media_type_val})")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if client:
            client.close()
            print("Database connection closed.")

if __name__ == "__main__":
    target_user_id = "67cd988d2cf7abfe3da0ae7d" # Jake's ID
    target_type = MediaType.TV # Target TV shows
    print(f"Checking stored recommendations for user: {target_user_id}, type: {target_type.value}")
    asyncio.run(check_recs(target_user_id, target_type))
    print("Check script finished.") 