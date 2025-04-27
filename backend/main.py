from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database.client import connect_to_mongo, close_mongo_connection
from app.routes import media, auth, shelf, reviews, clubs, club_messages
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.database.models.user import User
from app.database.models.shelf import ShelfModel, ShelfItemModel
from app.database.models.review import Review, ReviewLike
from app.database.models.club import Club
from app.database.models.club_post import ClubPost
from app.database.models.club_thread import ClubThread
from app.database.models.club_milestone import ClubMilestone
from app.database.models.club_message import ClubMessage
from config import Settings
import os
import asyncio
from app.services.article_service import ArticleService

app = FastAPI(title="Shelfd API")

# Get environment-specific settings
settings = Settings()
print(f"CORS Origins configured: {settings.CORS_ORIGINS}")

# CORS middleware configuration with more detailed settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Restrict to Next.js development server
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Ensure uploads directory exists
os.makedirs("uploads/club_covers", exist_ok=True)

# Mount the uploads directory to serve static files through multiple routes
app.mount("/club_covers", StaticFiles(directory="uploads/club_covers"), name="club_covers")
app.mount("/api/club_covers", StaticFiles(directory="uploads/club_covers"), name="api_club_covers")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(media.router, prefix="/media", tags=["media"])
app.include_router(shelf.router, prefix="/api/shelves", tags=["shelves"])
app.include_router(reviews.router, prefix="/api", tags=["reviews"])
app.include_router(clubs.router, prefix="/api/clubs", tags=["clubs"])
app.include_router(club_messages.router, tags=["club_messages"])

@app.on_event("startup")
async def startup_db_client():
    try:
        # Updated connection settings
        client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=5000,
            tls=True,
            tlsAllowInvalidCertificates=True
        )
        
        # Test the connection
        await client.admin.command('ping')
        
        # Initialize Beanie with all models
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
                ClubMessage
            ]
        )
        
        print("Successfully connected to MongoDB and initialized models!")
        print(f"Database name: {settings.MONGODB_NAME}")
        print(f"Collections initialized: {[model.Settings.name for model in [User, ShelfModel, ShelfItemModel, Review, ReviewLike, Club, ClubPost, ClubThread, ClubMilestone, ClubMessage]]}")
        
        # Fetch initial articles
        asyncio.create_task(fetch_initial_articles())
    except Exception as e:
        print(f"Failed to connect to MongoDB: {str(e)}")
        raise e

async def fetch_initial_articles():
    """Fetches articles in the background after startup"""
    try:
        print("Fetching initial articles from RSS feeds...")
        # Add a delay to ensure DB connection is fully established
        await asyncio.sleep(2)
        result = await ArticleService.fetch_and_store_articles()
        print(f"Fetched {result['total']} articles, {result['new']} are new")
    except Exception as e:
        print(f"Error fetching initial articles: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}