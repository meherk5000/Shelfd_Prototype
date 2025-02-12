from motor.motor_asyncio import AsyncIOMotorClient
from config import Settings

class Database:
    client: AsyncIOMotorClient = None
    settings: Settings = Settings()

    def get_db(self):
        return self.client[self.settings.MONGODB_NAME]

# Create a single instance
db = Database()

# These functions will be called from main.py
async def connect_to_mongo():
    db.client = AsyncIOMotorClient(
        db.settings.mongodb_url,
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    try:
        await db.client.admin.command('ping')
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        raise

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("MongoDB connection closed")   