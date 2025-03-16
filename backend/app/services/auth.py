from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from typing import Optional, Dict
import os
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")  # Using your env variable with fallback
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))  # Converting to int

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Simple in-memory rate limiting
# In a production environment, you might want to use Redis for distributed rate limiting
LOGIN_ATTEMPTS = {}  # Format: {ip_address: [(timestamp, email), ...]}
EMAIL_ATTEMPTS = {}  # Format: {email: [(timestamp, ip_address), ...]}
MAX_IP_ATTEMPTS = 10  # Maximum attempts from an IP within the time window
MAX_EMAIL_ATTEMPTS = 5  # Maximum attempts for a specific email within the time window
RATE_LIMIT_WINDOW = 300  # Time window in seconds (5 minutes)
LOCKOUT_DURATION = 1800  # Lockout duration in seconds (30 minutes) for repeated violations

def is_rate_limited(ip_address: str, email: str) -> tuple[bool, int]:
    """
    Check if the IP address or email is rate limited.
    Returns (is_limited, wait_time_seconds)
    """
    current_time = time.time()
    
    # Initialize if IP not in the dictionaries
    if ip_address not in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS[ip_address] = []
    
    if email not in EMAIL_ATTEMPTS:
        EMAIL_ATTEMPTS[email] = []
    
    # Clean up old attempts
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
    
    # Check for repeated violations (more aggressive rate limiting)
    repeated_violations = False
    if len(ip_attempts) > 0:
        oldest_ip_attempt = min(timestamp for timestamp, _ in ip_attempts)
        if current_time - oldest_ip_attempt < RATE_LIMIT_WINDOW and total_ip_attempts >= MAX_IP_ATTEMPTS:
            repeated_violations = True
    
    # Apply rate limiting logic
    if repeated_violations:
        # Apply longer lockout for repeated violations
        wait_time = LOCKOUT_DURATION
        return True, wait_time
    
    if total_ip_attempts >= MAX_IP_ATTEMPTS:
        oldest_timestamp = min(timestamp for timestamp, _ in ip_attempts)
        wait_time = int(RATE_LIMIT_WINDOW - (current_time - oldest_timestamp))
        return True, wait_time
    
    if total_email_attempts >= MAX_EMAIL_ATTEMPTS:
        oldest_timestamp = min(timestamp for timestamp, _ in email_attempts)
        wait_time = int(RATE_LIMIT_WINDOW - (current_time - oldest_timestamp))
        return True, wait_time
    
    # Add the current attempt to both trackers
    LOGIN_ATTEMPTS[ip_address].append((current_time, email))
    EMAIL_ATTEMPTS[email].append((current_time, ip_address))
    
    return False, 0

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    # Refresh tokens last longer (30 days)
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire, "refresh": True})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    print(f"Debug - Password verification:")
    print(f"Plain password: {plain_password}")
    print(f"Hashed password: {hashed_password}")
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        print(f"Debug - Password verification result: {result}")
        return result
    except Exception as e:
        print(f"Debug - Password verification error: {str(e)}")
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength requirements
    Returns (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
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
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # You'll implement the user lookup once we set up the routes
    return user_id