# backend/app/routers/threads.py
from typing import List, Optional
from datetime import datetime

from beanie import PydanticObjectId, Link
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.database.models.user import User
from app.database.models.club import Club
from app.database.models.club_thread import ClubThread
from app.database.models.club_message import ClubMessage
from app.routers.auth import get_current_user
from app.schemas.thread import (
    ThreadCreate, ThreadResponse,
    MessageCreate, MessageResponse
)
from app.services.auth import get_current_user

router = APIRouter()

# --- Helper Function for Authorization ---

async def get_club_and_check_membership(club_id: str, current_user: User) -> Club:
    club = await Club.get(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    if club_id not in current_user.club_memberships and str(club.creator.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You are not a member of this club")
    return club

async def check_if_moderator(club: Club, current_user: User):
    """Checks if the current user is the creator (moderator) of the club."""
    # Simple check: Only the creator can moderate for now
    # You might want a more complex role system later
    
    # Ensure creator is fetched if it's a Link
    if isinstance(club.creator, Link):
        await club.fetch_link(Club.creator)
        
    if current_user.id != club.creator.id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not authorized to moderate this club")


# --- Thread Endpoints ---

@router.post(
    "/clubs/{club_id}/threads",
    response_model=ThreadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["threads"]
)
async def create_thread_for_club(
    club_id: str,
    thread: ThreadCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new discussion thread within a specific club.
    Requires the user to be the club creator (moderator).
    """
    club = await get_club_and_check_membership(club_id, current_user)
    if not club.is_creator:
        raise HTTPException(status_code=403, detail="Only club creators can create threads")
    
    new_thread = ClubThread(
        title=thread.title,
        club=club_id,
        creator=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    await new_thread.insert()
    return ThreadResponse(
        id=str(new_thread.id),
        club_id=club_id,
        creator_id=str(current_user.id),
        title=new_thread.title,
        created_at=new_thread.created_at,
        updated_at=new_thread.updated_at,
        is_locked=False,
        is_pinned=False
    )


@router.get(
    "/clubs/{club_id}/threads",
    response_model=List[ThreadResponse],
    tags=["threads"]
)
async def list_threads_for_club(
    club_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Lists all discussion threads for a specific club.
    Requires the user to be a member of the club.
    """
    club = await get_club_and_check_membership(club_id, current_user)
    threads = await ClubThread.find(ClubThread.club == club_id).to_list()
    return [
        ThreadResponse(
            id=str(thread.id),
            club_id=club_id,
            creator_id=str(thread.creator),
            title=thread.title,
            created_at=thread.created_at,
            updated_at=thread.updated_at,
            is_locked=thread.is_locked,
            is_pinned=thread.is_pinned
        )
        for thread in threads
    ]

# --- Message Endpoints ---

@router.post(
    "/threads/{thread_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["messages"]
)
async def post_message_in_thread(
    thread_id: PydanticObjectId,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Posts a new message in a specific discussion thread.
    Requires the user to be a member of the club associated with the thread.
    """
    thread = await ClubThread.get(thread_id, fetch_links=True) # Fetch links to get club and creator
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    if thread.is_locked:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Thread is locked")

    # Check if the user is a member of the club this thread belongs to
    # Need to fetch the actual club object from the link
    if not thread.club:
         # This case should ideally not happen if fetch_links works correctly
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Club link missing for thread")
         
    # Access the club object directly now
    club_obj = thread.club 
    await get_club_and_check_membership(club_obj.id, current_user) # Reuse helper

    # Create the message
    new_message = ClubMessage(
        thread=thread,
        author=current_user,
        content=message_data.content
    )
    await new_message.create()
    await new_message.read() # Fetch db defaults like created_at

    # Prepare response
    return MessageResponse(
        id=new_message.id,
        thread_id=thread_id,
        author_id=current_user.id,
        author_username=current_user.username, # Add username
        author_email=current_user.email,      # Add email
        content=new_message.content,
        created_at=new_message.created_at,
        updated_at=new_message.updated_at,
    )


@router.get(
    "/threads/{thread_id}/messages",
    response_model=List[MessageResponse],
    tags=["messages"]
)
async def get_messages_for_thread(
    thread_id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100) # Add pagination
):
    """
    Retrieves messages for a specific discussion thread.
    Requires the user to be a member of the club associated with the thread.
    Includes basic pagination.
    """
    thread = await ClubThread.get(thread_id, fetch_links=True) # Fetch links to get club
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    # Check if the user is a member of the club this thread belongs to
    if not thread.club:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Club link missing for thread")
    club_obj = thread.club
    await get_club_and_check_membership(club_obj.id, current_user)

    # Fetch messages for the thread with pagination and sorting
    messages = await ClubMessage.find(ClubMessage.thread.id == thread_id, fetch_links=True) \
                                .sort("+created_at") \
                                .skip(skip) \
                                .limit(limit) \
                                .to_list()

    # Prepare response list
    response_list = []
    for message in messages:
        # Ensure author link is fetched
        if not message.author:
             # Log error or skip
             print(f"Warning: Message {message.id} missing author link.")
             continue
             
        # Access author details directly
        author_obj = message.author

        response_list.append(
            MessageResponse(
                id=message.id,
                thread_id=thread_id,
                author_id=author_obj.id,
                author_username=author_obj.username, # Access username from fetched author
                author_email=author_obj.email, # Access email
                content=message.content,
                created_at=message.created_at,
                updated_at=message.updated_at,
            )
        )
    return response_list 