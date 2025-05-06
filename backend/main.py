"""
Main application entry point for the Shelfd API.
This file initializes the FastAPI application, sets up middleware,
configures database connections, and registers all API routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database.client import connect_to_mongo, close_mongo_connection
from app.routes import media, auth, shelf, reviews, clubs, club_messages, recommendations
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
# Database models that need to be registered with Beanie ODM
from app.database.models.user import User
from app.database.models.shelf import ShelfModel, ShelfItemModel
from app.database.models.review import Review, ReviewLike
from app.database.models.club import Club
from app.database.models.club_post import ClubPost
from app.database.models.club_thread import ClubThread
from app.database.models.club_milestone import ClubMilestone
from app.database.models.club_message import ClubMessage
from app.database.models.recommendation import Recommendation
from config import Settings
import os
import asyncio
import certifi
from app.services.article_service import ArticleService
from datetime import datetime, timedelta
import pickle  # Used for loading serialized recommendation data

# Initialize the FastAPI application
app = FastAPI(title="Shelfd API")

# Load environment-specific settings
settings = Settings()
print(f"CORS Origins configured: {settings.CORS_ORIGINS}")

# CORS middleware to allow frontend applications to interact with this API
# This is crucial for browser security policies when frontend and backend are on different domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", # Add potential ports
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004"  # Add the current port
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Create the uploads directory for user-generated content if it doesn't exist
os.makedirs("uploads/club_covers", exist_ok=True)

# Serve static files from the uploads directory
# This lets us store and serve user uploaded content like club cover images
app.mount("/club_covers", StaticFiles(directory="uploads/club_covers"), name="club_covers")

# Track when recommendations were last updated to avoid excessive processing
last_recommendation_update = datetime.min

# Register all API route handlers by including their routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(media.router, prefix="/media", tags=["media"])
app.include_router(shelf.router, prefix="/api/shelves", tags=["shelves"])
app.include_router(reviews.router, prefix="/api", tags=["reviews"])
app.include_router(clubs.router, prefix="/api/clubs", tags=["clubs"])
app.include_router(club_messages.router, tags=["club_messages"])
app.include_router(recommendations.router, prefix="/api", tags=["recommendations"])

@app.on_event("startup")
async def startup_db_client():
    """
    Initialize database connection and models when the API server starts.
    This function runs once on application startup to:
    1. Establish MongoDB connection
    2. Initialize Beanie ODM with all data models
    3. Start background tasks for article fetching and recommendation updates
    """
    try:
        # Create MongoDB client with appropriate security settings
        client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=5000,
            # Using certifi to ensure secure connections with valid certificates
            tlsCAFile=certifi.where()
        )
        
        # Test the database connection
        await client.admin.command('ping')
        
        # Initialize Beanie ODM with all document models
        # This sets up the ODM to work with the MongoDB collections
        await init_beanie(
            database=client[settings.MONGODB_NAME],
            document_models=[
                User, 
                ShelfModel, 
                ShelfItemModel, 
                Review, 
                ReviewLike, 
                Club, 
                ClubPost, 
                ClubThread, 
                ClubMilestone, 
                ClubMessage,
                Recommendation
            ]
        )
        
        print("Successfully connected to MongoDB and initialized models!")
        print(f"Database name: {settings.MONGODB_NAME}")
        print(f"Collections initialized: {[model.Settings.name for model in [User, ShelfModel, ShelfItemModel, Review, ReviewLike, Club, ClubPost, ClubThread, ClubMilestone, ClubMessage, Recommendation]]}")
        
        # Start background tasks for data maintenance
        asyncio.create_task(fetch_initial_articles())
        asyncio.create_task(periodic_recommendation_updates())
    except Exception as e:
        print(f"Failed to connect to MongoDB: {str(e)}")
        raise e

async def fetch_initial_articles():
    """
    Fetches the latest articles from RSS feeds after server startup.
    This ensures the application has fresh content without manual intervention.
    """
    try:
        print("Fetching initial articles from RSS feeds...")
        # Add a delay to ensure DB connection is fully established
        await asyncio.sleep(2)
        result = await ArticleService.fetch_and_store_articles()
        print(f"Fetched {result['total']} articles, {result['new']} are new")
    except Exception as e:
        print(f"Error fetching initial articles: {e}")

async def periodic_recommendation_updates():
    """
    Background task that runs recommendation updates on a weekly schedule.
    This ensures users get fresh recommendations without requiring manual updates.
    
    The function loads pre-computed recommendation data from files and uses it
    to generate personalized recommendations for all users.
    """
    global last_recommendation_update

    # Define paths to the saved recommendation model data files
    DATA_DIR = os.path.join("scripts", "data")
    BOOK_VECTORS_PATH = os.path.join(DATA_DIR, "book_vectors.pkl")
    BOOK_MAPPING_PATH = os.path.join(DATA_DIR, "book_mapping.pkl")
    BOOK_DETAILS_PATH = os.path.join(DATA_DIR, "book_details.pkl")
    MOVIE_VECTORS_PATH = os.path.join(DATA_DIR, "movie_vectors.pkl")
    MOVIE_MAPPING_PATH = os.path.join(DATA_DIR, "movie_mapping.pkl")
    MOVIE_DETAILS_PATH = os.path.join(DATA_DIR, "movie_details.pkl")
    TV_VECTORS_PATH = os.path.join(DATA_DIR, "tv_vectors.pkl")
    TV_MAPPING_PATH = os.path.join(DATA_DIR, "tv_mapping.pkl")
    TV_DETAILS_PATH = os.path.join(DATA_DIR, "tv_details.pkl")

    # Run forever in the background
    while True:
        now = datetime.utcnow()

        # Only run update if it's been at least 7 days since the last one
        if now - last_recommendation_update > timedelta(days=7):
            print("Running scheduled recommendation update")
            try:
                # Load precomputed recommendation data from files
                print("Loading recommendation data...")
                if not all(os.path.exists(p) for p in [
                    BOOK_VECTORS_PATH, BOOK_MAPPING_PATH, BOOK_DETAILS_PATH,
                    MOVIE_VECTORS_PATH, MOVIE_MAPPING_PATH, MOVIE_DETAILS_PATH,
                    TV_VECTORS_PATH, TV_MAPPING_PATH, TV_DETAILS_PATH
                ]):
                    print("Error: One or more recommendation data files not found. Run build script first.")
                    # Skip this update cycle if files are missing
                    await asyncio.sleep(6 * 60 * 60) # Sleep 6 hours before next check
                    continue 
                
                # Load each recommendation data file
                with open(BOOK_VECTORS_PATH, 'rb') as f: book_vectors = pickle.load(f)
                with open(BOOK_MAPPING_PATH, 'rb') as f: book_mapping = pickle.load(f)
                with open(BOOK_DETAILS_PATH, 'rb') as f: book_details = pickle.load(f)
                with open(MOVIE_VECTORS_PATH, 'rb') as f: movie_vectors = pickle.load(f)
                with open(MOVIE_MAPPING_PATH, 'rb') as f: movie_mapping = pickle.load(f)
                with open(MOVIE_DETAILS_PATH, 'rb') as f: movie_details = pickle.load(f)
                with open(TV_VECTORS_PATH, 'rb') as f: tv_vectors = pickle.load(f)
                with open(TV_MAPPING_PATH, 'rb') as f: tv_mapping = pickle.load(f)
                with open(TV_DETAILS_PATH, 'rb') as f: tv_details = pickle.load(f)
                print("Recommendation data loaded successfully.")

                # Import the recommendation update function
                from scripts.build_recommendation_model import update_all_recommendations
                
                # Generate new recommendations for all users
                await update_all_recommendations(
                    book_vectors, book_mapping, book_details,
                    movie_vectors, movie_mapping, movie_details,
                    tv_vectors, tv_mapping, tv_details
                )

                # Update the timestamp to track when we last ran this process
                last_recommendation_update = now
                print("Recommendation update completed successfully")
            except Exception as e:
                print(f"Error in recommendation update: {e}")

        # Check again in 6 hours to avoid unnecessary CPU usage
        await asyncio.sleep(6 * 60 * 60)

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connections when the server shuts down."""
    await close_mongo_connection()

# Simple health check endpoint for monitoring
@app.get("/health")
async def health_check():
    """Check if the API server is running."""
    return {"status": "healthy"}