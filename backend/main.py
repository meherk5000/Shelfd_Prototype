from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.client import connect_to_mongo, close_mongo_connection
from app.routes import media, auth, shelf
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.database.models.user import User
from app.database.models.shelf import ShelfModel, ShelfItemModel
from config import Settings
import os

app = FastAPI(title="Shelfd API")

# Get environment-specific settings
settings = Settings()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(media.router, prefix="/media", tags=["media"])
app.include_router(shelf.router, prefix="/api/shelves", tags=["shelves"])

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
        
        await init_beanie(
            database=client[settings.mongodb_name],
            document_models=[User, ShelfModel, ShelfItemModel]
        )
        print(f"Successfully connected to MongoDB and initialized Beanie!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {str(e)}")
        raise e

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}