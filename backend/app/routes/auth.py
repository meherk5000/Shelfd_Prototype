from fastapi import APIRouter, HTTPException, Depends, Header
from ..database.models.user import User
from ..services.auth import create_access_token, verify_password, get_password_hash
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from ..services.shelf_service import ShelfService
from ..database.schemas.shelf import MediaType, ShelfType

router = APIRouter()
load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
async def signup(user_data: UserCreate):
    try:
        print(f"Debug - Received signup request for email: {user_data.email}")
        
        # Check if user exists
        existing_user = await User.find_one({"email": user_data.email})
        if existing_user:
            print(f"Debug - Email already registered: {user_data.email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        print("Debug - Creating new user")
        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=get_password_hash(user_data.password)
        )
        print("Debug - Saving user to database")
        await user.save()
        
        # Create default shelves for each media type
        print(f"Debug - Creating default shelves for user ID: {str(user.id)}")
        media_types = [
            MediaType.BOOK,
            MediaType.MOVIE,
            MediaType.TV_SHOW,
            MediaType.ARTICLE
        ]
        
        for media_type in media_types:
            await ShelfService.create_default_shelves(
                user_id=str(user.id),
                media_type=media_type
            )
        
        # Create token
        print("Debug - Creating access token")
        token = create_access_token({"sub": str(user.id)})
        
        print("Debug - Signup successful")
        return {
            "access_token": token, 
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username
            }
        }
        
    except Exception as e:
        print(f"Debug - Error in signup: {str(e)}")
        print(f"Debug - Error type: {type(e)}")
        import traceback
        print(f"Debug - Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/login")
async def login(user_data: UserLogin):
    print(f"Debug - Login attempt received:")
    print(f"Debug - Email: {user_data.email}")
    print(f"Debug - Password length: {len(user_data.password)}")
    
    try:
        user = await User.find_one({"email": user_data.email})
        print(f"Debug - User lookup result: {user is not None}")
        
        if not user:
            print("Debug - User not found in database")
            raise HTTPException(status_code=400, detail="Invalid email or password")
            
        is_valid = verify_password(user_data.password, user.hashed_password)
        print(f"Debug - Password verification result: {is_valid}")
        
        if not is_valid:
            print("Debug - Invalid password")
            raise HTTPException(status_code=400, detail="Invalid email or password")
        
        token = create_access_token({"sub": str(user.id)})
        print("Debug - Access token created")
        
        response_data = {
            "access_token": token, 
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username
            }
        }
        print("Debug - Sending successful login response")
        return response_data
        
    except Exception as e:
        print(f"Debug - Login error: {str(e)}")
        print(f"Debug - Error type: {type(e)}")
        raise

@router.get("/me")
async def get_current_user_info(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "id": str(user.id),
            "email": user.email,
            "username": user.username
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/test-db")
async def test_db():
    try:
        # Try to count users
        count = await User.count()
        return {"message": "Database connection successful", "user_count": count}
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")