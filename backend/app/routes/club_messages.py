from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.database.models.club_message import ClubMessage
from app.database.models.user import User
from app.database.models.club import Club
from app.database.schemas.club_message import MessageCreate, MessageResponse
from app.services.auth import get_current_user, oauth2_scheme
from app.services.club_service import ClubService
import logging
from beanie import PydanticObjectId
from bson.errors import InvalidId

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/clubs", tags=["club_messages"])

@router.post("/{club_id}/messages", response_model=MessageResponse)
async def create_message(
    club_id: str,
    message: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new message in a club."""
    try:
        logger.info(f"Creating message in club {club_id} by user {current_user.id}")
        logger.info(f"Message content: {message.content}")
        
        try:
            # Convert string ID to PydanticObjectId
            club_object_id = PydanticObjectId(club_id)
            logger.info(f"Converted club_id to ObjectId: {club_object_id}")
        except InvalidId as e:
            logger.error(f"Invalid club ID format: {club_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid club ID format: {club_id}"
            )
        
        # Get the club
        club = await Club.get(club_object_id)
        if not club:
            logger.error(f"Club {club_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Club not found"
            )
        
        logger.info(f"Found club: {club.name}")
        
        # Check if user is a member or creator of the club
        is_member = False
        try:
            # Check if user is a member
            for member in club.members:
                member_id = str(member.id) if hasattr(member, 'id') else str(member.ref.id)
                if member_id == str(current_user.id):
                    is_member = True
                    break
            
            if is_member:
                logger.info(f"User {current_user.id} is a member of club {club_id}")
            
            # Check if user is the creator
            creator_id = str(club.creator.id) if hasattr(club.creator, 'id') else str(club.creator.ref.id)
            is_creator = creator_id == str(current_user.id)
            
            if is_creator:
                logger.info(f"User {current_user.id} is the creator of club {club_id}")
            
            if not is_member and not is_creator:
                logger.error(f"User {current_user.id} not authorized to post in club {club_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be a member of the club to post messages"
                )
            
            try:
                # Create the message with proper relationships
                new_message = ClubMessage(
                    club=club,
                    author=current_user,
                    content=message.content
                )
                
                # Save the message
                logger.info(f"Saving message to database")
                await new_message.save()
                logger.info(f"Message saved successfully with ID {new_message.id}")
                
                response = MessageResponse(
                    id=str(new_message.id),
                    club_id=club_id,
                    author_id=str(current_user.id),
                    author_username=current_user.username,
                    content=new_message.content,
                    created_at=new_message.created_at
                )
                logger.info(f"Successfully created message: {response}")
                return response
            except Exception as e:
                logger.error(f"Error creating or saving message: {str(e)}")
                logger.exception("Full traceback:")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error creating or saving message: {str(e)}"
                )
            
        except Exception as e:
            logger.error(f"Error in membership check: {str(e)}")
            logger.exception("Full traceback:")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error checking club membership: {str(e)}"
            )
            
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Unexpected error creating message: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error creating message: {str(e)}"
        )

@router.get("/{club_id}/messages", response_model=List[MessageResponse])
async def get_club_messages(
    club_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all messages for a club."""
    try:
        logger.info(f"Fetching messages for club {club_id}")
        
        try:
            # Convert string ID to PydanticObjectId
            club_object_id = PydanticObjectId(club_id)
        except InvalidId as e:
            logger.error(f"Invalid club ID format: {club_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid club ID format: {club_id}"
            )
        
        # Get the club and fetch linked creator/members
        club = await Club.get(club_object_id, fetch_links=True)
        if not club:
            logger.error(f"Club {club_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Club not found"
            )
        
        logger.info(f"Found club: {club.name}")
        
        # --- BEGIN DEBUG LOGGING ---
        logger.info(f"Current User ID: {current_user.id} (Type: {type(current_user.id)})")
        if club.creator:
            logger.info(f"Club Creator ID: {club.creator.id} (Type: {type(club.creator.id)})")
        else:
            logger.warning("Club creator link is None or not fetched.")
        if club.members:
            member_ids = [(m.id, type(m.id)) for m in club.members if m] # Get IDs and types of valid members
            logger.info(f"Club Member IDs: {member_ids}")
        else:
             logger.warning("Club members list is None, empty, or not fetched.")
        # --- END DEBUG LOGGING ---

        # Check if user is a member or creator (assuming links are fetched)
        is_member = False
        is_creator = False
        try:
            # Check if user is the creator
            if club.creator and club.creator.id == current_user.id:
                is_creator = True
                logger.info(f"User {current_user.id} is the creator of club {club_id}")

            # Check if user is a member (only if not the creator)
            if not is_creator and club.members:
                for member in club.members:
                   # Check if the member object is valid and compare ID
                   if member and member.id == current_user.id:
                       is_member = True
                       logger.info(f"User {current_user.id} is a member of club {club_id}")
                       break # Found the member

            # Raise forbidden error if user is neither creator nor member
            if not is_member and not is_creator:
                logger.error(f"User {current_user.id} not authorized to view messages in club {club_id}")
                # This specific error means the user isn't allowed to see messages.
                # We will catch this specific exception below and return an empty list.
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view messages"
                )
            
            # --- If authorized, proceed to fetch messages ---
            messages = await ClubMessage.find(
                ClubMessage.club.id == club_object_id
            ).sort(-ClubMessage.created_at).to_list()
            
            logger.info(f"Found {len(messages)} messages for club {club_id}")
            
            # Format messages for response
            formatted_messages = []
            for message in messages:
                try:
                    # Fetch author for each message if it's a link
                    author = await message.author.fetch() if hasattr(message.author, 'fetch') else message.author
                    if not author:
                        logger.warning(f"Skipping message {message.id} due to missing author link.")
                        continue
                        
                    formatted_messages.append(
                        MessageResponse(
                            id=str(message.id),
                            club_id=club_id,
                            author_id=str(author.id),
                            author_username=author.username,
                            content=message.content,
                            created_at=message.created_at
                        )
                    )
                except Exception as fmt_e:
                    logger.error(f"Error formatting message {message.id}: {str(fmt_e)}")
                    # Skip messages with formatting errors
                    continue
            
            return formatted_messages
            
        except HTTPException as http_exc:
            # If it's our specific 403 for authorization, return empty list
            if http_exc.status_code == status.HTTP_403_FORBIDDEN and http_exc.detail == "Not authorized to view messages":
                logger.info(f"User {current_user.id} not authorized for club {club_id} messages. Returning empty list.")
                return []
            # Otherwise, re-raise the HTTPException (e.g., 404 if club not found earlier)
            raise http_exc
        except Exception as e:
            # Catch any other unexpected errors during auth check or message fetching/formatting
            logger.error(f"Unexpected error during message retrieval or authorization check: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal error fetching messages or checking permissions"
            )
            
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch messages: {str(e)}"
        ) 