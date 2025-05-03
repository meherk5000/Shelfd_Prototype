from fastapi import APIRouter, HTTPException, Depends, Header, Request
from ..database.models.user import User
from ..services.auth import create_access_token, create_refresh_token, verify_password, get_password_hash, validate_password_strength, is_rate_limited, get_current_user
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from ..services.shelf_service import ShelfService
from ..database.schemas.shelf import MediaType, ShelfType
from datetime import datetime, timedelta

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

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

@router.post("/signup", status_code=201)
async def signup(user_data: UserCreate, request: Request):
    try:
        # Validate password strength
        is_valid, error_message = validate_password_strength(user_data.password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        # Check if user exists
        existing_user = await User.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=409, detail="Email already registered")
        
        # Also check for username uniqueness
        existing_username = await User.find_one({"username": user_data.username})
        if existing_username:
            raise HTTPException(status_code=409, detail="Username already taken")
        
        # Create user
        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=get_password_hash(user_data.password)
        )
        await user.save()
        
        # Create default shelves for each media type
        for media_type in [
            MediaType.BOOK,
            MediaType.MOVIE,
            MediaType.TV,
            MediaType.ARTICLE,
        ]:
            await ShelfService.create_default_shelves(
                user_id=str(user.id),
                media_type=media_type
            )
        
        # Create tokens
        access_token = create_access_token({"sub": str(user.id)})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username
            }
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"ERROR during signup: {e}") 
        import traceback
        print(f"Debug - Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/login")
async def login(user_data: UserLogin, request: Request):
    # Get client IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"
    
    # Check rate limiting before processing login
    is_limited, wait_time = is_rate_limited(client_ip, user_data.email)
    if is_limited:
        raise HTTPException(
            status_code=429, 
            detail=f"Too many login attempts. Please try again in {wait_time} seconds."
        )
    
    user = await User.find_one({"email": user_data.email})
    
    if user:
        pass # Avoid empty block
    
    if not user:
        # Use same error message for security (don't reveal if email exists)
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    is_valid = verify_password(user_data.password, user.hashed_password)
    
    if not is_valid:
        # The attempt was already recorded by the initial call to is_rate_limited.
        # Re-calling here is likely incorrect and removed.
        # # Check rate limiting again after failed attempt
        # is_limited, wait_time = is_rate_limited(client_ip, user_data.email)
        # if is_limited:
        #     raise HTTPException(
        #         status_code=429, 
        #         detail=f"Too many failed login attempts. Please try again in {wait_time} seconds."
        #     )
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    response_data = {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username
        }
    }
    return response_data

@router.get("/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    """Get information about the currently authenticated user."""
    # The get_current_user dependency already handles token validation and user fetching.
    # It raises appropriate HTTPExceptions on failure.
    return {
        "id": str(user.id),
        "email": user.email,
        "username": user.username
    }

@router.get("/test-db")
async def test_db():
    try:
        # Try to count users
        count = await User.count()
        return {"message": "Database connection successful", "user_count": count}
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/refresh-token")
async def refresh_token(request: Request):
    """
    Create a new access token using a valid refresh token
    """
    authorization = request.headers.get("Authorization")
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    refresh_token = authorization.split(" ")[1]
    
    try:
        # Decode and validate refresh token
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=["HS256"])
        
        # Check if this is a refresh token
        if not payload.get("refresh"):
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user to ensure they still exist
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create new access token
        access_token = create_access_token({"sub": user_id})
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """
    Initiates password reset process
    In a production app, this would send an email with a reset link
    For now, we'll just generate the token and return it
    """
    user = await User.find_one({"email": request.email})
    
    # Always return success even if email doesn't exist (security best practice)
    if not user:
        return {"message": "If your email is registered, you will receive a password reset link"}
    
    # Create a special short-lived token for password reset
    reset_token = create_access_token(
        {"sub": str(user.id), "purpose": "password_reset"},
        expires_delta=timedelta(hours=1)
    )
    
    # TODO: In a real app, send this via email
    # For now, we'll just return it for testing
    return {
        "message": "If your email is registered, you will receive a password reset link",
        "reset_token": reset_token  # Remove this in production
    }

@router.post("/reset-password")
async def reset_password(reset_data: PasswordReset):
    """
    Resets password using token from forgot-password endpoint
    """
    try:
        # Verify the reset token
        payload = jwt.decode(reset_data.token, SECRET_KEY, algorithms=["HS256"])
        
        # Ensure it's a password reset token
        if payload.get("purpose") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid token")
        
        # Validate the new password
        is_valid, error_message = validate_password_strength(reset_data.new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        # Get the user
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update the password
        user.hashed_password = get_password_hash(reset_data.new_password)
        await user.save()
        
        return {"message": "Password has been reset successfully"}
    
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")