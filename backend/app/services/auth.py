"""
Authentication Service for Shelfd API.

This module provides the core authentication functionality for the application, including:
- JWT token generation and validation
- Password hashing and verification
- Rate limiting for login attempts to prevent brute force attacks
- Password strength validation

The authentication system uses JWT (JSON Web Tokens) for stateless authentication,
with separate access and refresh tokens for better security.
"""

from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status, Header
from typing import Optional, Dict, TYPE_CHECKING
import os
from dotenv import load_dotenv
import time

if TYPE_CHECKING:
        from ..database.models.user import User # Import only for type checkers

# Load environment variables for auth configuration
# This ensures sensitive details aren't hardcoded in the source code
load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")  # Using your env variable with fallback
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))  # Converting to int

# Password hashing configuration using bcrypt
# This creates a cryptographic context that will be used for hashing and verifying passwords
# bcrypt is a secure password hashing algorithm that includes built-in salting
# "deprecated" parameter handles automatic upgrading of outdated hashing algorithms
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication in FastAPI
# This configures the endpoint where clients should get tokens
# It also sets up Swagger UI to include the authorization button
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Rate limiting configuration
# This is a simple in-memory implementation that could be replaced with Redis in production
# The goal is to prevent brute force attacks by limiting login attempts
#
# SECURITY NOTE: This in-memory implementation will reset when the server restarts
# and won't work in a multi-server environment. Production systems should use
# a distributed caching system like Redis for rate limiting.

# Tracks login attempts by IP address
# Format: {ip_address: [(timestamp, email), ...]}
LOGIN_ATTEMPTS = {}  

# Tracks login attempts by email
# Format: {email: [(timestamp, ip_address), ...]}
EMAIL_ATTEMPTS = {}  

# Maximum attempts from an IP within the time window
# This helps prevent distributed brute force attacks from a single source
MAX_IP_ATTEMPTS = 10  

# Maximum attempts for a specific email within the time window
# This helps protect specific user accounts from targeted attacks
MAX_EMAIL_ATTEMPTS = 5  

# Time window in seconds (5 minutes) 
# After this time, old login attempts are no longer counted
RATE_LIMIT_WINDOW = 300  

# Lockout duration in seconds (30 minutes) for repeated violations
# This adds an escalating response to persistent attackers
LOCKOUT_DURATION = 1800  

def is_rate_limited(ip_address: str, email: str) -> tuple[bool, int]:
    """
    Check if a login attempt should be rate limited based on IP address or email.
    
    This implements a two-level rate limiting strategy:
    1. Limits attempts from a specific IP address
    2. Limits attempts for a specific email address
    
    This helps protect against brute force attacks while still allowing
    legitimate users to access their accounts from different devices.
    
    Args:
        ip_address: The IP address of the client
        email: The email being used for login
        
    Returns:
        Tuple of (is_limited, wait_time_seconds)
    """
    current_time = time.time()
    
    # Initialize if IP or email not in the dictionaries
    if ip_address not in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS[ip_address] = []
    
    if email not in EMAIL_ATTEMPTS:
        EMAIL_ATTEMPTS[email] = []
    
    # Clean up old attempts that are outside the time window
    # This ensures we only count recent attempts within our defined window
    LOGIN_ATTEMPTS[ip_address] = [
        (timestamp, attempt_email) 
        for timestamp, attempt_email in LOGIN_ATTEMPTS[ip_address] 
        if current_time - timestamp < RATE_LIMIT_WINDOW
    ]
    
    EMAIL_ATTEMPTS[email] = [
        (timestamp, attempt_ip) 
        for timestamp, attempt_ip in EMAIL_ATTEMPTS[email] 
        if current_time - timestamp < RATE_LIMIT_WINDOW
    ]
    
    # Check for IP-based rate limiting
    ip_attempts = LOGIN_ATTEMPTS[ip_address]
    total_ip_attempts = len(ip_attempts)
    
    # Check for email-based rate limiting
    email_attempts = EMAIL_ATTEMPTS[email]
    total_email_attempts = len(email_attempts)
    
    # Check for repeated violations that require more aggressive rate limiting
    # This implements an escalating response to persistent attackers
    repeated_violations = False
    if len(ip_attempts) > 0:
        oldest_ip_attempt = min(timestamp for timestamp, _ in ip_attempts)
        if current_time - oldest_ip_attempt < RATE_LIMIT_WINDOW and total_ip_attempts >= MAX_IP_ATTEMPTS:
            repeated_violations = True
    
    # Apply rate limiting logic and calculate wait time
    if repeated_violations:
        # Apply longer lockout for repeated violations
        wait_time = LOCKOUT_DURATION
        return True, wait_time
    
    if total_ip_attempts >= MAX_IP_ATTEMPTS:
        # Calculate how long until the oldest attempt expires from the window
        oldest_timestamp = min(timestamp for timestamp, _ in ip_attempts)
        wait_time = int(RATE_LIMIT_WINDOW - (current_time - oldest_timestamp))
        return True, wait_time
    
    if total_email_attempts >= MAX_EMAIL_ATTEMPTS:
        # Calculate how long until the oldest attempt expires from the window
        oldest_timestamp = min(timestamp for timestamp, _ in email_attempts)
        wait_time = int(RATE_LIMIT_WINDOW - (current_time - oldest_timestamp))
        return True, wait_time
    
    # Record this attempt in both trackers for future rate limit checks
    LOGIN_ATTEMPTS[ip_address].append((current_time, email))
    EMAIL_ATTEMPTS[email].append((current_time, ip_address))
    
    # Not rate limited
    return False, 0

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create a JWT access token with an expiration time.
    
    Access tokens are short-lived tokens used for API authentication.
    These tokens should be included in the Authorization header for
    protected API endpoints.
    
    Args:
        data: The data to encode in the token (typically contains user ID)
        expires_delta: Optional custom expiration time
        
    Returns:
        The encoded JWT token string
    """
    to_encode = data.copy()
    
    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # Add expiration claim to the token payload
    to_encode.update({"exp": expire})
    
    # Encode the token using the secret key and specified algorithm
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """
    Create a JWT refresh token.
    
    Refresh tokens are long-lived tokens used to obtain new access tokens.
    They include a 'refresh' flag to distinguish them from access tokens.
    
    This implements a refresh token rotation pattern, where a new refresh
    token is issued whenever an access token is refreshed, improving security.
    
    Args:
        data: The data to encode in the token (typically contains user ID)
        
    Returns:
        The encoded JWT refresh token string
    """
    to_encode = data.copy()
    
    # Refresh tokens last longer (30 days)
    # This allows users to stay logged in while minimizing risk from stolen access tokens
    expire = datetime.utcnow() + timedelta(days=30)
    
    # Add expiration and refresh flag to token payload
    to_encode.update({"exp": expire, "refresh": True})
    
    # Encode the token using the secret key and specified algorithm
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash using the configured password context.
    
    Uses a constant-time comparison to prevent timing attacks.
    A timing attack is when an attacker measures how long it takes to 
    compare passwords to extract information about the real password.
    
    Args:
        plain_password: The plaintext password to verify
        hashed_password: The stored password hash
        
    Returns:
        True if the password matches, False otherwise
    """
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        return result
    except Exception as e:
        # If there's any error during verification, treat it as a failed match
        # This protects against malformed hashes or other security issues
        return False

def get_password_hash(password: str) -> str:
    """
    Hash a password using the configured password context.
    
    bcrypt automatically handles:
    - Salt generation (random data added to the password)
    - Multiple rounds of hashing (computational cost to slow brute force attacks)
    - Secure hash algorithms
    
    Args:
        password: The plaintext password to hash
        
    Returns:
        The password hash string
    """
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength requirements
    
    This enforces good password practices to protect user accounts.
    
    Checks for:
    - Minimum length (8 characters)
    - Uppercase letters
    - Lowercase letters
    - Numbers
    - Special characters
    
    Args:
        password: The password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    # Check individual complexity requirements
    has_uppercase = any(char.isupper() for char in password)
    has_lowercase = any(char.islower() for char in password)
    has_digit = any(char.isdigit() for char in password)
    has_special = any(not char.isalnum() for char in password)
    
    if not (has_uppercase and has_lowercase and has_digit):
        return False, "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    
    if not has_special:
        return False, "Password must contain at least one special character"
    
    return True, ""

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    FastAPI dependency that extracts and validates the user from a JWT token.
    
    This is used to protect routes that require authentication. It will raise
    an HTTPException with a 401 status code if the token is invalid.
    
    This function is typically used with FastAPI's dependency injection system:
    
    ```
    @app.get("/protected-route")
    async def protected_route(current_user: User = Depends(get_current_user)):
        return {"message": f"Hello, {current_user.username}!"}
    ```
    
    Args:
        token: The JWT token (automatically extracted by FastAPI)
        
    Returns:
        The authenticated User object
        
    Raises:
        HTTPException: If the token is invalid or the user doesn't exist
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode and validate the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        # JWT decode fails if the token is invalid, expired, or tampered with
        raise credentials_exception
    
    # Import User here to avoid circular imports
    from ..database.models.user import User
    from beanie import PydanticObjectId
    
    try:
        # Retrieve the user from the database
        # This ensures the user still exists in the system
        user = await User.get(PydanticObjectId(user_id))
        if user is None:
            raise credentials_exception
        return user
    except Exception:
        # Any error retrieving the user should fail authentication
        raise credentials_exception

async def get_optional_current_user(authorization: Optional[str] = Header(None)) -> Optional['User']:
    """
    Attempts to authenticate the user based on the Authorization header without raising exceptions.
    
    This is used for routes that work with or without authentication, such as
    endpoints that show different content for authenticated vs anonymous users.
    
    Example use case: a public page that shows personalized content for logged-in users.
    
    Args:
        authorization: The Authorization header value
        
    Returns:
        The User object if authentication succeeds, None otherwise
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None  # No token provided

    token = authorization.split(" ")[1]
    
    try:
        # Decode and validate the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None # Invalid token payload
            
        from ..database.models.user import User
        from beanie import PydanticObjectId

        # Retrieve the user from the database
        user = await User.get(PydanticObjectId(user_id))
        if user is None:
            return None # User not found
            
        return user
        
    except JWTError:
        return None # Token is invalid or expired
    except Exception:
        # Catch any other potential errors during user fetching etc.
        # Unlike the mandatory authentication version, this will never raise exceptions
        return None