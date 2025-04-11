from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from beanie import PydanticObjectId
from pydantic import BaseModel, Field
import asyncio
import os
import shutil
import uuid
from fastapi.staticfiles import StaticFiles
from datetime import datetime

from ..database.models.user import User
from ..database.models.club import Club
from ..database.models.club_post import ClubPost
from ..database.models.club_milestone import ClubMilestone
from ..database.models.club_thread import ClubThread
from ..services.club_service import ClubService
from ..services.auth import get_current_user

router = APIRouter(tags=["clubs"])

# Ensure the uploads directory exists
os.makedirs("uploads/club_covers", exist_ok=True)

# Request/Response models
class CreateClubRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    media_type: str = Field(..., pattern="^(book|movie|tv)$")
    description: Optional[str] = Field(None, max_length=1000)
    is_private: bool = Field(default=False)
    cover_image: Optional[str] = None
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    book_cover: Optional[str] = None
    book_id: Optional[str] = None  # Add this field to match frontend

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Sci-Fi Book Club",
                "media_type": "book",
                "description": "A club for science fiction book lovers",
                "is_private": False,
                "book_title": "Dune",
                "book_author": "Frank Herbert"
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
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    book_cover: Optional[str] = None

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
    book_author: str
    book_cover: Optional[str] = None

# Routes
@router.post("/create", response_model=ClubResponse)
async def create_club(
    request: CreateClubRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a new club."""
    club = await ClubService.create_club(
        name=request.name,
        creator=current_user,
        media_type=request.media_type,
        description=request.description,
        is_private=request.is_private,
        cover_image=request.cover_image,
        book_title=request.book_title,
        book_author=request.book_author,
        book_cover=request.book_cover,
    )
    return await format_club_response(club, current_user)

@router.get("", response_model=List[ClubResponse])
async def get_clubs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    media_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get all clubs with optional filtering."""
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

@router.delete("/{club_id}")
async def delete_club(
    club_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Delete a club."""
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

@router.post("/{club_id}/threads", response_model=List[ThreadResponse])
async def create_threads(
    club_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    """Create discussion threads for a book club."""
    # Get the club to get the book title
    club = await ClubService.get_club(club_id)
    
    if club.media_type != "book" or not club.book_title:
        raise HTTPException(status_code=400, detail="Club must be a book club with a book title")
    
    threads = await ClubService.create_threads_for_book(
        club_id=club_id,
        creator=current_user,
        book_title=club.book_title,
    )
    return [await format_thread_response(thread) for thread in threads]

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
    """Update a club with book information and generate chapter threads"""
    try:
        # Convert string ID to ObjectId
        obj_id = PydanticObjectId(club_id)
        
        # Get the club
        club = await Club.get(obj_id)
        if not club:
            raise HTTPException(status_code=404, detail="Club not found")
        
        # Check if user is creator/admin
        if str(club.creator_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Only the club creator can update book information")
            
        # Update book information
        club.book_id = request.book_id
        club.book_title = request.book_title
        club.book_author = request.book_author
        club.book_cover = request.book_cover
        
        # Save club
        await club.save()
        
        # Generate thread titles based on book title (simplified for now)
        # Later we can integrate with Google Books API to get actual chapters
        club_service = ClubService()
        await club_service.generate_book_threads(club, current_user)
        
        return await format_club_response(club, current_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update club book: {str(e)}")

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
    
    for member in club.members:
        if hasattr(member, 'fetch'):
            # It's a Link object
            fetched_member = await member.fetch()
            members.append(fetched_member)
            member_ids.append(fetched_member.id)
        else:
            # It's already a User object
            members.append(member)
            member_ids.append(member.id)
    
    return {
        "id": str(club.id),
        "name": club.name,
        "description": club.description,
        "creator_id": str(creator.id),
        "creator_username": creator.username,
        "member_count": len(members),
        "media_type": club.media_type,
        "is_private": club.is_private,
        "created_at": club.created_at.isoformat(),
        "is_member": current_user and current_user.id in member_ids,
        "is_creator": current_user and current_user.id == creator.id,
        "cover_image": club.cover_image,
        "book_title": club.book_title,
        "book_author": club.book_author,
        "book_cover": club.book_cover,
    }

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