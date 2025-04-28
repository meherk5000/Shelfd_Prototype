from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
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
        club_data = request.model_dump()
        logger.debug("[Backend] Processed request data: %s", club_data)
        
        # Correctly assign Links instead of raw IDs
        club_data["creator"] = Link(current_user, document_class=User)
        club_data["members"] = [Link(current_user, document_class=User)]
        # Assuming admins field exists and also needs Links
        # club_data["admins"] = [Link(current_user, document_class=User)] 
        
        logger.debug("[Backend] Final club data before creation (using Links): %s", club_data)
        
        club = Club(**club_data)
        logger.debug("[Backend] Club object created, about to save to database")
        
        await club.create()
        logger.debug("[Backend] Club successfully created in database with ID: %s", club.id)
        
        # Format the response using the helper function
        return await format_club_response(club, current_user)
    except Exception as e:
        logger.error("[Backend] Error creating club: %s", str(e), exc_info=True)
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
    # Get clubs where user is a member
    member_clubs, member_total = await ClubService.get_user_clubs(current_user, skip, limit)
    
    # Get clubs created by the user
    created_clubs, created_total = await ClubService.get_created_clubs(current_user, skip, limit)
    
    # Combine and deduplicate clubs
    all_clubs = list({club.id: club for club in member_clubs + created_clubs}.values())
    
    # Format all clubs
    return [await format_club_response(club, current_user) for club in all_clubs]

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
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate a unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = f"uploads/club_covers/{unique_filename}"
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the file URL (path that can be accessed via API)
    return {"url": f"/club_covers/{unique_filename}"}

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
        club = await Club.get(obj_id)
        if not club:
            raise HTTPException(status_code=404, detail="Club not found")
        
        # Check if user is creator/admin
        creator = await club.creator.fetch() # Fetch creator directly
        if str(creator.id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Only the club creator can update book information")
            
        # Verify this is a book club
        if club.media_type != "book":
            raise HTTPException(status_code=400, detail="This club is not a book club")
            
        # Update book information
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
        await club.save()
        
        # Removed thread generation call
        # club_service = ClubService()
        # await club_service.generate_book_threads(club, current_user)
        
        return await format_club_response(club, current_user)
    except Exception as e:
        print(f"Error updating club book: {str(e)}")
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
        club = await Club.get(obj_id, fetch_links=True)
        if not club:
            raise HTTPException(status_code=404, detail="Club not found")
        
        # Check if user is creator/admin (Now that links are fetched)
        # Ensure creator is fetched and perform direct ID check
        if not club.creator or club.creator.id != current_user.id:
            logger.error(f"Auth failed: User {current_user.id} != Creator {club.creator.id if club.creator else 'None'} for club {club_id}")
            raise HTTPException(status_code=403, detail="Only the club creator can update movie information")
        
        # Verify this is a movie club
        if club.media_type != "movie":
            raise HTTPException(status_code=400, detail="This club is not a movie club")
            
        # Update movie information
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
        await club.save()
        
        return await format_club_response(club, current_user)
    except Exception as e:
        print(f"Error updating club movie: {str(e)}")
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
        # Fetch the club with the creator link resolved
        club = await Club.get(obj_id, fetch_links=True) 
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
        
        # Ensure creator is fetched and perform direct ID check
        if not club.creator or club.creator.id != current_user.id:
            logger.error(f"Auth failed: User {current_user.id} != Creator {club.creator.id if club.creator else 'None'} for club {club_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the club creator can update TV show information")
        
        # Verify this is a TV show club
        if club.media_type != "tv":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This club is not a TV show club")
            
        # Update TV show information
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
        await club.save()
        
        # Return the updated club details, correctly formatted
        return await format_club_response(club, current_user) 
        
    except HTTPException as he:
        # Re-raise specific HTTP exceptions (like 404, 403, 400)
        raise he
    except Exception as e:
        # Catch unexpected errors and return 500
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
    """Format a club object for response."""
    # Fetch the creator user if it's a Link
    if hasattr(club.creator, 'fetch'):
        creator = await club.creator.fetch()
    else:
        # Creator is already a User object
        creator = club.creator
    
    # Fetch all member users, handling both Link objects and direct User objects
    member_ids = []
    members = []
    
    # Ensure club.members is not None before iterating
    if club.members:
        for member_ref in club.members:
            # Check if member_ref is valid before fetching/accessing
            if member_ref:
                if hasattr(member_ref, 'fetch'):
                    # It's a Link object
                    fetched_member = await member_ref.fetch()
                    if fetched_member: # Ensure fetch was successful
                        members.append(fetched_member)
                        # Store string representation of ID
                        member_ids.append(str(fetched_member.id)) 
                elif isinstance(member_ref, User): 
                    # It's already a User object
                    members.append(member_ref)
                    # Store string representation of ID
                    member_ids.append(str(member_ref.id)) 
                else:
                    # Log unexpected member reference type if needed
                    print(f"Warning: Unexpected member reference type in club {club.id}: {type(member_ref)}")
            else:
                 print(f"Warning: Found None member reference in club {club.id}")
    else:
        print(f"Warning: club.members is None for club {club.id}")

    # Debugging logs
    creator_id_str = str(creator.id) if creator else "None"
    current_user_id_str = str(current_user.id) if current_user else "None"
    print(f"DEBUG [format_club_response] Club: {club.name} ({club.id})")
    print(f"DEBUG [format_club_response] Creator ID: {creator_id_str}")
    print(f"DEBUG [format_club_response] Current User ID: {current_user_id_str}")
    print(f"DEBUG [format_club_response] Member IDs: {member_ids}")

    # Calculate flags
    is_member_flag = bool(current_user and current_user_id_str in member_ids)
    is_creator_flag = bool(current_user and creator and current_user_id_str == creator_id_str)
    
    print(f"DEBUG [format_club_response] Calculated is_member: {is_member_flag}")
    print(f"DEBUG [format_club_response] Calculated is_creator: {is_creator_flag}")

    # Construct and return a ClubResponse instance
    return ClubResponse(
        id=str(club.id),
        name=club.name,
        description=club.description,
        creator_id=str(creator.id) if creator else None, # Handle case where creator might be None
        creator_username=creator.username if creator else "Unknown", # Handle case where creator might be None
        member_count=len(members),
        media_type=club.media_type,
        is_private=club.is_private,
        created_at=club.created_at.isoformat(),
        # Use calculated flags
        is_member=is_member_flag,
        is_creator=is_creator_flag,
        cover_image=club.cover_image,
        # Book fields
        book_title=club.book_title,
        book_author=club.book_author,
        book_cover=club.book_cover,
        book_id=club.book_id,
        # Movie fields
        movie_title=club.movie_title,
        movie_director=club.movie_director,
        movie_poster=club.movie_poster,
        movie_id=club.movie_id,
        movie_year=club.movie_year,
        # TV show fields
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