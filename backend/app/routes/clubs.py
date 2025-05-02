from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from beanie import PydanticObjectId, Link
from pydantic import BaseModel, Field, validator
import asyncio
import os
import shutil
import uuid
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import logging
from fastapi import status

from ..database.models.user import User
from ..database.models.club import Club
from ..database.models.club_post import ClubPost
from ..database.models.club_milestone import ClubMilestone
from ..database.models.club_thread import ClubThread
from ..services.club_service import ClubService
from ..services.auth import get_current_user, get_optional_current_user

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

router = APIRouter(tags=["clubs"])

# Ensure the uploads directory exists
os.makedirs("uploads/club_covers", exist_ok=True)

# Request/Response models
class CreateClubRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    media_type: str = Field(..., pattern="^(book|movie|tv)$")
    is_private: bool = Field(default=False)
    cover_image: Optional[str] = None
    
    # Book-specific fields (optional)
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    book_cover: Optional[str] = None
    book_id: Optional[str] = None
    
    # Movie-specific fields (optional)
    movie_title: Optional[str] = None
    movie_director: Optional[str] = None
    movie_year: Optional[int] = None
    movie_poster: Optional[str] = None
    movie_id: Optional[str] = None
    
    # TV Show-specific fields (optional)
    tv_title: Optional[str] = None
    tv_creator: Optional[str] = None
    tv_year: Optional[int] = None
    tv_poster: Optional[str] = None
    tv_id: Optional[str] = None
    tv_season: Optional[int] = None
    tv_episode: Optional[int] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Sci-Fi Book Club",
                "media_type": "book",
                "description": "A club for science fiction book lovers",
                "is_private": False
            }
        }
    }

class CreatePostRequest(BaseModel):
    content: str

class UpdateClubRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None

class ClubResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    creator_id: str
    creator_username: str
    member_count: int
    media_type: str
    is_private: bool
    created_at: str
    is_member: bool
    is_creator: bool
    cover_image: Optional[str] = None
    # Book fields
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    book_cover: Optional[str] = None
    book_id: Optional[str] = None
    # Movie fields
    movie_title: Optional[str] = None
    movie_director: Optional[str] = None
    movie_poster: Optional[str] = None
    movie_id: Optional[str] = None
    movie_year: Optional[int] = None
    # TV show fields
    tv_title: Optional[str] = None
    tv_creator: Optional[str] = None
    tv_poster: Optional[str] = None
    tv_id: Optional[str] = None
    tv_year: Optional[int] = None
    tv_season: Optional[int] = None
    tv_episode: Optional[int] = None

    model_config = {
        "from_attributes": True
    }

class ClubPostResponse(BaseModel):
    id: str
    content: str
    author_id: str
    author_username: str
    created_at: str
    updated_at: str
    is_pinned: bool
    is_edited: bool

    model_config = {
        "from_attributes": True
    }

class CreateMilestoneRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    milestone_date: datetime

class MilestoneResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    milestone_date: str
    creator_id: str
    creator_username: str
    created_at: str

class ThreadResponse(BaseModel):
    id: str
    title: str
    thread_type: str
    chapter_number: Optional[int] = None
    order: int
    creator_id: str
    creator_username: str
    created_at: str

class UpdateClubBookRequest(BaseModel):
    book_id: str
    book_title: str
    book_author: Optional[str] = None
    book_cover: Optional[str] = None

class UpdateClubMovieRequest(BaseModel):
    movie_id: str
    movie_title: str
    movie_director: Optional[str] = None
    movie_year: Optional[int] = None
    movie_poster: Optional[str] = None

class UpdateClubTVShowRequest(BaseModel):
    tv_id: str
    tv_title: str
    tv_creator: Optional[str] = None
    tv_year: Optional[int] = None
    tv_poster: Optional[str] = None
    tv_season: Optional[int] = None
    tv_episode: Optional[int] = None

# Routes
@router.post("/create", response_model=ClubResponse)
async def create_club(
    request: CreateClubRequest,
    current_user: User = Depends(get_current_user)
) -> ClubResponse:
    logger.debug("[Backend] Received club creation request with data: %s", request.model_dump())
    logger.debug("[Backend] Current user: %s (ID: %s)", current_user.username, current_user.id)

    try:
        # Use the ClubService to handle creation (which now returns a fetched object)
        created_club = await ClubService.create_club(
            name=request.name,
            creator=current_user,
            media_type=request.media_type,
            description=request.description,
            is_private=request.is_private,
            cover_image=request.cover_image,
            book_title=request.book_title,
            book_author=request.book_author,
            book_cover=request.book_cover,
            book_id=request.book_id,
        )
        
        logger.debug("[Backend Route] Club successfully created and fetched via service with ID: %s", created_club.id)

        # Add the creator to the members list
        if current_user not in created_club.members:
            created_club.members.append(current_user)
            await created_club.save() # Save the change to the database
            logger.debug("[Backend Route] Added creator %s to members list for club %s", current_user.id, created_club.id)
            # Optional: Refetch the club to ensure all links are resolved, if save() doesn't handle it
            # created_club = await Club.get(created_club.id, fetch_links=True)

        # Format the response using the updated club object
        return await format_club_response(created_club, current_user)
    except HTTPException as he:
        # Re-raise HTTPExceptions directly (e.g., validation errors from service)
        logger.error("[Backend] HTTPException during club creation: %s - %s", he.status_code, he.detail)
        raise he
    except Exception as e:
        logger.error("[Backend] Error creating club via service: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create club: {str(e)}")

@router.get("", response_model=List[ClubResponse])
async def get_clubs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    media_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Get all clubs with optional filtering."""
    # Log whether a user was found or not
    if current_user:
        logger.debug(f"[get_clubs] User ID {current_user.id} authenticated (optional)")
    else:
        logger.debug("[get_clubs] No authenticated user provided (optional)")
        
    clubs, _ = await ClubService.get_clubs(
        skip=skip,
        limit=limit,
        media_type=media_type,
        search=search,
    )
    return [await format_club_response(club, current_user) for club in clubs]

@router.get("/user", response_model=List[ClubResponse])
async def get_user_clubs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Get clubs a user is a member of."""
    clubs, total = await ClubService.get_user_clubs(current_user, skip, limit)
    
    # Return formatted responses directly as a list comprehension
    return [await format_club_response(club, current_user) for club in clubs]

@router.get("/created", response_model=List[ClubResponse])
async def get_created_clubs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Get clubs created by the current user."""
    clubs, total = await ClubService.get_created_clubs(current_user, skip, limit)
    
    # Return formatted responses directly as a list comprehension
    return [await format_club_response(club, current_user) for club in clubs]

@router.get("/my", response_model=List[ClubResponse])
async def get_my_clubs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Get clubs the current user is a member of or has created."""
    # Get ALL clubs where user is a member (remove pagination here)
    member_clubs, _ = await ClubService.get_user_clubs(current_user, skip=0, limit=0) # limit=0 to fetch all
    
    # Get ALL clubs created by the user (remove pagination here)
    created_clubs, _ = await ClubService.get_created_clubs(current_user, skip=0, limit=0) # limit=0 to fetch all
    
    # Combine and deduplicate clubs
    # Ensure creator status is potentially preserved correctly if object identity matters
    # (Using club.id as key is generally safe)
    all_clubs_dict = {club.id: club for club in member_clubs + created_clubs}
    all_combined_clubs = list(all_clubs_dict.values())
    
    # Apply pagination AFTER combining and deduplicating
    paginated_clubs = all_combined_clubs[skip : skip + limit]
    
    # Format the paginated subset of clubs
    formatted_clubs = []
    for club in paginated_clubs:
        try:
            formatted_clubs.append(await format_club_response(club, current_user))
        except Exception as e:
            logger.error(f"Error formatting club {club.id} in get_my_clubs: {e}", exc_info=True)
            # Optionally, skip clubs that fail to format
            # continue 

    return formatted_clubs

@router.get("/{club_id}", response_model=ClubResponse)
async def get_club(
    club_id: PydanticObjectId,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get a specific club."""
    club = await ClubService.get_club(club_id)
    return await format_club_response(club, current_user)

@router.post("/{club_id}/join")
async def join_club(
    club_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Join a club."""
    club = await ClubService.join_club(club_id, current_user)
    return {"message": "Successfully joined club"}

@router.post("/{club_id}/leave")
async def leave_club(
    club_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Leave a club."""
    club = await ClubService.leave_club(club_id, current_user)
    return {"message": "Successfully left club"}

@router.get("/{club_id}/posts", response_model=List[ClubPostResponse])
async def get_club_posts(
    club_id: PydanticObjectId,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get all posts in a club."""
    posts, _ = await ClubService.get_club_posts(club_id, skip, limit)
    return [await format_post_response(post) for post in posts]

@router.post("/{club_id}/posts", response_model=ClubPostResponse)
async def create_post(
    club_id: PydanticObjectId,
    request: CreatePostRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a new post in a club."""
    post = await ClubService.create_post(club_id, current_user, request.content)
    return await format_post_response(post)

@router.delete("/{club_id}", response_model=None)
async def delete_club(
    club_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Delete a club and all its associated data."""
    await ClubService.delete_club(club_id, current_user)
    return {"message": "Club deleted successfully"}

@router.patch("/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: PydanticObjectId,
    request: UpdateClubRequest,
    current_user: User = Depends(get_current_user),
):
    """Update club details."""
    club = await ClubService.update_club(
        club_id,
        current_user,
        name=request.name,
        description=request.description,
        is_private=request.is_private,
    )
    return await format_club_response(club, current_user)

@router.post("/upload-cover")
async def upload_club_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a cover image for a club."""
    logger.debug(f"[Upload Cover] Received file: {file.filename}, Content-Type: {file.content_type}")

    # Validate file type (using the automatically parsed file)
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"[Upload Cover] Validation failed: Invalid content type '{file.content_type}' for file '{file.filename}'")
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate a unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = f"uploads/club_covers/{unique_filename}"
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"[Upload Cover] Successfully saved file to: {file_path}")
    except Exception as e:
        logger.error(f"[Upload Cover] Failed to save uploaded file '{file.filename}' to '{file_path}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    relative_url = f"/club_covers/{unique_filename}"
    logger.debug(f"[Upload Cover] Returning URL: {relative_url}")
    return {"url": relative_url}

@router.post("/{club_id}/milestones", response_model=MilestoneResponse)
async def create_milestone(
    club_id: PydanticObjectId,
    request: CreateMilestoneRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a new milestone for a club."""
    milestone = await ClubService.create_milestone(
        club_id=club_id,
        creator=current_user,
        title=request.title,
        milestone_date=request.milestone_date,
        description=request.description,
    )
    return await format_milestone_response(milestone)

@router.get("/{club_id}/milestones", response_model=List[MilestoneResponse])
async def get_club_milestones(
    club_id: PydanticObjectId,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get all milestones for a club."""
    milestones = await ClubService.get_club_milestones(club_id)
    return [await format_milestone_response(milestone) for milestone in milestones]

@router.get("/{club_id}/threads", response_model=List[ThreadResponse])
async def get_club_threads(
    club_id: PydanticObjectId,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get all discussion threads for a club."""
    threads = await ClubService.get_club_threads(club_id)
    return [await format_thread_response(thread) for thread in threads]

@router.put("/{club_id}/book", response_model=ClubResponse)
async def update_club_book(
    club_id: str,
    request: UpdateClubBookRequest,
    current_user: User = Depends(get_current_user),
):
    """Update a club with book information"""
    try:
        obj_id = PydanticObjectId(club_id)
        club = await Club.get(obj_id) # Step 1: Get club (no links needed yet)
        if not club:
            raise HTTPException(status_code=404, detail="Club not found")
        
        # Step 2: Check if user is creator/admin (Robustly handle Link or User)
        if not club.creator:
            raise HTTPException(status_code=500, detail="Club creator information is missing.")
        
        creator_user: Optional[User] = None
        if hasattr(club.creator, 'fetch'): # Check if it's a Link
            creator_user = await club.creator.fetch()
        elif isinstance(club.creator, User): # Check if it's already a User
            creator_user = club.creator
        # else: We can optionally log an error if it's neither
        
        if not creator_user:
            raise HTTPException(status_code=500, detail="Failed to resolve club creator details.")
        
        if str(creator_user.id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Only the club creator can update book information")
            
        # Step 3: Verify media type and update fields
        if club.media_type != "book":
            raise HTTPException(status_code=400, detail="This club is not a book club")
            
        club.book_id = request.book_id
        club.book_title = request.book_title
        club.book_author = request.book_author
        club.book_cover = request.book_cover
        
        # Clear other media types
        club.movie_id = None
        club.movie_title = None
        club.movie_director = None
        club.movie_year = None
        club.movie_poster = None
        club.tv_id = None
        club.tv_title = None
        club.tv_creator = None
        club.tv_year = None
        club.tv_poster = None
        club.tv_season = None
        club.tv_episode = None
        
        club.updated_at = datetime.utcnow()
        
        # Step 4: Save changes
        await club.save()
        
        # Step 5: Re-fetch the club WITH links to ensure data consistency for response
        updated_club = await Club.get(club.id, fetch_links=True)
        if not updated_club:
             # Should not happen, but handle edge case
             raise HTTPException(status_code=404, detail="Club not found after update.")
        
        # Step 6: Format the fully updated and fetched club
        return await format_club_response(updated_club, current_user)
        
    except Exception as e:
        # Log the actual error for debugging
        logger.error(f"Error updating club book for club {club_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update club book: {str(e)}")

@router.put("/{club_id}/movie", response_model=ClubResponse)
async def update_club_movie(
    club_id: str,
    request: UpdateClubMovieRequest,
    current_user: User = Depends(get_current_user),
):
    """Update a club with movie information"""
    try:
        obj_id = PydanticObjectId(club_id)
        club = await Club.get(obj_id) # Step 1: Get club (no links needed yet)
        if not club:
            raise HTTPException(status_code=404, detail="Club not found")
        
        # Step 2: Check if user is creator/admin (Robustly handle Link or User)
        if not club.creator:
             raise HTTPException(status_code=500, detail="Club creator information is missing.")

        creator_user: Optional[User] = None
        if hasattr(club.creator, 'fetch'): # Check if it's a Link
            creator_user = await club.creator.fetch()
        elif isinstance(club.creator, User): # Check if it's already a User
            creator_user = club.creator
            
        if not creator_user:
             raise HTTPException(status_code=500, detail="Failed to resolve club creator details.")

        if str(creator_user.id) != str(current_user.id):
             logger.error(f"Auth failed: User {current_user.id} != Creator {creator_user.id} for club {club_id}")
             raise HTTPException(status_code=403, detail="Only the club creator can update movie information")

        # Step 3: Verify media type and update fields
        if club.media_type != "movie":
            raise HTTPException(status_code=400, detail="This club is not a movie club")
            
        club.movie_id = request.movie_id
        club.movie_title = request.movie_title
        club.movie_director = request.movie_director
        club.movie_year = request.movie_year
        club.movie_poster = request.movie_poster
        
        # Clear other media types
        club.book_id = None
        club.book_title = None
        club.book_author = None
        club.book_cover = None
        club.tv_id = None
        club.tv_title = None
        club.tv_creator = None
        club.tv_year = None
        club.tv_poster = None
        club.tv_season = None
        club.tv_episode = None
        
        club.updated_at = datetime.utcnow()
        
        # Step 4: Save changes
        await club.save()
        
        # Step 5: Re-fetch the club WITH links
        updated_club = await Club.get(club.id, fetch_links=True)
        if not updated_club:
             raise HTTPException(status_code=404, detail="Club not found after update.")

        # Step 6: Format the response
        return await format_club_response(updated_club, current_user)
        
    except Exception as e:
        # Log the actual error for debugging
        logger.error(f"Error updating club movie for club {club_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update club movie: {str(e)}")

@router.put("/{club_id}/tv-show", response_model=ClubResponse)
async def update_club_tv(
    club_id: str,
    request: UpdateClubTVShowRequest,
    current_user: User = Depends(get_current_user),
):
    """Update a club with TV show information"""
    try:
        obj_id = PydanticObjectId(club_id)
        club = await Club.get(obj_id) # Step 1: Get club (no links needed yet)
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
        
        # Step 2: Check if user is creator/admin (Robustly handle Link or User)
        if not club.creator:
             raise HTTPException(status_code=500, detail="Club creator information is missing.")

        creator_user: Optional[User] = None
        if hasattr(club.creator, 'fetch'): # Check if it's a Link
            creator_user = await club.creator.fetch()
        elif isinstance(club.creator, User): # Check if it's already a User
            creator_user = club.creator
            
        if not creator_user:
             raise HTTPException(status_code=500, detail="Failed to resolve club creator details.")

        if str(creator_user.id) != str(current_user.id):
            logger.error(f"Auth failed: User {current_user.id} != Creator {creator_user.id} for club {club_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the club creator can update TV show information")
        
        # Step 3: Verify media type and update fields
        if club.media_type != "tv":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This club is not a TV show club")
            
        club.tv_id = request.tv_id
        club.tv_title = request.tv_title
        club.tv_creator = request.tv_creator
        club.tv_year = request.tv_year
        club.tv_poster = request.tv_poster
        club.tv_season = request.tv_season
        club.tv_episode = request.tv_episode
        
        # Clear other media types
        club.book_id = None
        club.book_title = None
        club.book_author = None
        club.book_cover = None
        club.movie_id = None
        club.movie_title = None
        club.movie_director = None
        club.movie_year = None
        club.movie_poster = None
        
        club.updated_at = datetime.utcnow()
        
        # Step 4: Save changes
        await club.save()
        
        # Step 5: Re-fetch the club WITH links
        updated_club = await Club.get(club.id, fetch_links=True)
        if not updated_club:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found after update.")
        
        # Step 6: Format the response
        return await format_club_response(updated_club, current_user) 
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unexpected error updating club TV show for club {club_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update club TV show: An unexpected error occurred.")

@router.get("/{club_id}/members")
async def get_club_members(
    club_id: PydanticObjectId,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get all members of a club."""
    try:
        club = await ClubService.get_club(club_id)
        
        # Get creator ID properly
        if hasattr(club.creator, 'fetch'):
            creator = await club.creator.fetch()
            creator_id = str(creator.id)
        else:
            creator_id = str(club.creator.id)
        
        # Format members for response
        members = []
        for member in club.members:
            if hasattr(member, 'fetch'):
                user = await member.fetch()
            else:
                user = member
                
            members.append({
                "id": str(user.id),
                "username": user.username,
                "is_creator": str(user.id) == creator_id,
                "avatar_url": getattr(user, 'avatar_url', None)
            })
        
        return members
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_club_members: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to fetch club members", "message": str(e)}
        )

# Helper functions
async def format_club_response(club: Club, current_user: Optional[User] = None) -> ClubResponse:
    """Format a club object for response, handling Links/DBRefs robustly."""
    creator: Optional[User] = None
    creator_id_str = "None"
    creator_username = "Unknown"

    # --- Re-added Link Fetching Logic for Creator ---
    try:
        if club.creator:
            if hasattr(club.creator, 'fetch'):
                 logger.debug(f"Club {club.id}: Creator is a Link, fetching...")
                 creator = await club.creator.fetch()
            elif isinstance(club.creator, User):
                 logger.debug(f"Club {club.id}: Creator is already a User object.")
                 creator = club.creator
            else:
                 logger.warning(f"Club {club.id}: Creator is of unexpected type: {type(club.creator)}. Value: {club.creator}")

            if creator:
                creator_id_str = str(creator.id)
                creator_username = creator.username
                logger.debug(f"Club {club.id}: Successfully processed creator: {creator_username} ({creator_id_str})")
            else:
                logger.warning(f"Club {club.id}: Failed to fetch creator from link/DBRef: {club.creator}")
        else:
             logger.warning(f"Club {club.id} has no creator link.")

    except Exception as e:
        logger.error(f"Error processing creator for club {club.id}: {e}", exc_info=True)
    # --- End Re-added Logic ---

    # --- Re-added Link Fetching Logic for Members ---
    member_ids = []
    valid_members_count = 0 
    members_list = club.members or []
    logger.debug(f"[Robust Format] Club {club.id}: Input members_list (type={type(members_list)}): {members_list}") # Log input
    if members_list:
        logger.debug(f"[Robust Format] Club {club.id}: Processing {len(members_list)} potential members.")
        for i, member_link_or_obj in enumerate(members_list):
            logger.debug(f"[Robust Format] Club {club.id}: Processing item {i} (type={type(member_link_or_obj)}): {member_link_or_obj}")
            if member_link_or_obj: 
                try:
                    member_user = None
                    if hasattr(member_link_or_obj, 'fetch') and not isinstance(member_link_or_obj, User):
                        logger.debug(f"[Robust Format] Club {club.id}: Item {i} is a Link, fetching...")
                        member_user = await member_link_or_obj.fetch()
                        if member_user:
                           logger.debug(f"[Robust Format] Club {club.id}: Fetched member {member_user.id}")
                        else:
                           logger.warning(f"[Robust Format] Club {club.id}: Fetch returned None for item {i}")
                    elif isinstance(member_link_or_obj, User):
                        logger.debug(f"[Robust Format] Club {club.id}: Item {i} is already a User object.")
                        member_user = member_link_or_obj
                    else:
                        logger.warning(f"[Robust Format] Club {club.id}: Item {i} is unexpected type: {type(member_link_or_obj)}")
                    
                    if member_user and hasattr(member_user, 'id'): # Ensure fetched/existing user has ID
                        member_id_str = str(member_user.id)
                        if member_id_str not in member_ids: # Avoid duplicates if logic error somewhere
                            member_ids.append(member_id_str)
                            valid_members_count += 1 
                        else:
                            logger.warning(f"[Robust Format] Club {club.id}: Duplicate member ID {member_id_str} detected.")
                    # No need for an else here, warnings logged above if fetch fails or type is wrong
                except Exception as e:
                    logger.error(f"[Robust Format] Error processing member item {i} ({member_link_or_obj}) for club {club.id}: {e}", exc_info=True)
            else:
                 logger.warning(f"[Robust Format] Club {club.id}: Found a None value in members list at index {i}.")
    else:
         logger.debug(f"[Robust Format] Club {club.id}: No members list found or it's empty.")
    logger.debug(f"[Robust Format] Club {club.id}: Finished processing members. Count={valid_members_count}, IDs={member_ids}")
    # --- End Re-added Logic ---

    # Determine if the current user is a member/creator
    current_user_id_str = str(current_user.id) if current_user else None

    is_member_flag = bool(current_user and current_user_id_str in member_ids)
    is_creator_flag = bool(current_user and creator and current_user_id_str == str(creator.id))

    logger.debug(f"[Robust Format] Club {club.id}: Calculated member_count: {valid_members_count}")
    logger.debug(f"[Robust Format] Club {club.id}: Calculated is_member: {is_member_flag}")
    logger.debug(f"[Robust Format] Club {club.id}: Calculated is_creator: {is_creator_flag}")

    return ClubResponse(
        id=str(club.id),
        name=club.name,
        description=club.description,
        creator_id=creator_id_str,
        creator_username=creator_username,
        member_count=valid_members_count, # Use count from explicit processing
        media_type=club.media_type,
        is_private=club.is_private,
        created_at=club.created_at.isoformat(),
        is_member=is_member_flag,
        is_creator=is_creator_flag,
        cover_image=club.cover_image,
        book_title=club.book_title,
        book_author=club.book_author,
        book_cover=club.book_cover,
        book_id=club.book_id,
        movie_title=club.movie_title,
        movie_director=club.movie_director,
        movie_poster=club.movie_poster,
        movie_id=club.movie_id,
        movie_year=club.movie_year,
        tv_title=club.tv_title,
        tv_creator=club.tv_creator,
        tv_poster=club.tv_poster,
        tv_id=club.tv_id,
        tv_year=club.tv_year,
        tv_season=club.tv_season,
        tv_episode=club.tv_episode
    )

async def format_post_response(post: ClubPost) -> ClubPostResponse:
    """Format a post object for response."""
    # Get author properly
    if hasattr(post.author, 'fetch'):
        author = await post.author.fetch()
    else:
        author = post.author
    
    return {
        "id": str(post.id),
        "content": post.content,
        "author_id": str(author.id),
        "author_username": author.username,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat(),
        "is_pinned": post.is_pinned,
        "is_edited": post.is_edited,
    }

async def format_milestone_response(milestone: ClubMilestone) -> MilestoneResponse:
    """Format a milestone object for response."""
    creator = await milestone.creator.fetch()
    
    return {
        "id": str(milestone.id),
        "title": milestone.title,
        "description": milestone.description,
        "milestone_date": milestone.milestone_date.isoformat(),
        "creator_id": str(creator.id),
        "creator_username": creator.username,
        "created_at": milestone.created_at.isoformat(),
    }

async def format_thread_response(thread: ClubThread) -> ThreadResponse:
    """Format a thread object for response."""
    creator = await thread.creator.fetch()
    
    return {
        "id": str(thread.id),
        "title": thread.title,
        "thread_type": thread.thread_type,
        "chapter_number": thread.chapter_number,
        "order": thread.order,
        "creator_id": str(creator.id),
        "creator_username": creator.username,
        "created_at": thread.created_at.isoformat(),
    } 