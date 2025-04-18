from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.database.models.club_message import ClubMessage
from app.database.models.user import User
from app.database.models.club import Club
from app.schemas.club_message import MessageCreate, MessageResponse
from app.services.auth import get_current_user
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
        for member in club.members:
            if hasattr(member, 'fetch'):
                fetched_member = await member.fetch()
                if str(fetched_member.id) == str(current_user.id):
                    is_member = True
                    break
            elif str(member.id) == str(current_user.id):
                is_member = True
                break
                
        if is_member:
            logger.info(f"User {current_user.id} is a member of club {club_id}")
        
        # Check if user is the creator
        creator = await club.creator.fetch()
        is_creator = str(creator.id) == str(current_user.id)
        if is_creator:
            logger.info(f"User {current_user.id} is the creator of club {club_id}")
        
        if not is_member and not is_creator:
            logger.error(f"User {current_user.id} not authorized to post in club {club_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of the club to post messages"
            )
        
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
        
        # Fetch the author details
        author = await new_message.author.fetch()
        
        response = MessageResponse(
            id=str(new_message.id),
            club_id=club_id,
            author_id=str(current_user.id),
            author_username=author.username,
            content=new_message.content,
            created_at=new_message.created_at
        )
        logger.info(f"Successfully created message: {response}")
        return response
        
    except Exception as e:
        logger.error(f"Error creating message: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create message: {str(e)}"
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
        
        # Get the club and check membership
        club = await Club.get(club_object_id)
        if not club:
            logger.error(f"Club {club_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Club not found"
            )
        
        logger.info(f"Found club: {club.name}")
        
        # Check if user is a member or creator
        is_member = False
        try:
            for member in club.members:
                try:
                    if hasattr(member, 'fetch'):
                        fetched_member = await member.fetch()
                        if str(fetched_member.id) == str(current_user.id):
                            is_member = True
                            break
                    elif str(member.id) == str(current_user.id):
                        is_member = True
                        break
                except Exception as e:
                    logger.warning(f"Error fetching member: {str(e)}")
                    continue
                    
            if is_member:
                logger.info(f"User {current_user.id} is a member of club {club_id}")
            
            # Check if user is the creator
            try:
                creator = await club.creator.fetch()
                is_creator = str(creator.id) == str(current_user.id)
                if is_creator:
                    logger.info(f"User {current_user.id} is the creator of club {club_id}")
            except Exception as e:
                logger.error(f"Error fetching creator: {str(e)}")
                is_creator = False
            
            if not is_member and not is_creator:
                logger.error(f"User {current_user.id} not authorized to view messages in club {club_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view messages"
                )
            
            # Get messages for the club
            messages = await ClubMessage.find(
                ClubMessage.club.id == club_object_id
            ).sort(-ClubMessage.created_at).to_list()
            
            logger.info(f"Found {len(messages)} messages for club {club_id}")
            
            # Format messages for response
            formatted_messages = []
            for message in messages:
                try:
                    author = await message.author.fetch()
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
                except Exception as e:
                    logger.error(f"Error formatting message {message.id}: {str(e)}")
                    # Skip messages with broken links
                    continue
            
            return formatted_messages
            
        except Exception as e:
            logger.error(f"Error checking membership: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error checking club membership"
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