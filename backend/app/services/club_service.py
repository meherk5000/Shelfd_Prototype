from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from beanie import PydanticObjectId, Link
from fastapi import HTTPException
import asyncio
import logging

from ..database.models.club import Club
from ..database.models.club_post import ClubPost
from ..database.models.user import User
from ..database.models.club_milestone import ClubMilestone
from ..database.models.club_thread import ClubThread

logger = logging.getLogger(__name__)

class ClubService:
    @staticmethod
    async def create_club(
        name: str,
        creator: User,
        media_type: str,
        description: Optional[str] = None,
        is_private: bool = False,
        cover_image: Optional[str] = None,
        book_title: Optional[str] = None,
        book_author: Optional[str] = None,
        book_cover: Optional[str] = None,
        book_id: Optional[str] = None,
    ) -> Club:
        """Create a new club."""
        # Validate media type
        if media_type not in ["book", "movie", "tv"]:
            raise HTTPException(status_code=400, detail="Invalid media type")

        # Create club object WITH members list initially
        creator_link = Link(creator, User)
        club = Club(
            name=name,
            description=description,
            creator=creator_link,
            members=[creator_link], # Add creator to members list directly
            media_type=media_type,
            is_private=is_private,
            cover_image=cover_image,
            book_title=book_title,
            book_author=book_author,
            book_cover=book_cover,
            book_id=book_id,
        )
        
        try:
            await club.create()
            logger.info(f"Created club {club.id} for {name} using create()")

            # --- Re-fetch within the service --- 
            await asyncio.sleep(0.5) # Keep delay for potential DB replication lag?
            fetched_club = await ClubService.get_club(club.id)
            if not fetched_club:
                logger.error(f"[Service] Failed to re-fetch club {club.id} immediately after creation.")
                raise HTTPException(status_code=500, detail="Failed to retrieve club details after creation within service.")
            
            logger.info(f"[Service] Re-fetched club {fetched_club.id} after creation (using get_club). Members: {fetched_club.members}")
            return fetched_club # Return the fetched object

        except Exception as e:
             club_id_str = str(club.id) if hasattr(club, 'id') and club.id else "UNKNOWN_ID"
             logger.error(f"Club {club_id_str}: Failed during club.create() or re-fetch: {e}", exc_info=True)
             raise HTTPException(status_code=500, detail=f"Failed to create club: {str(e)}")

    @staticmethod
    async def get_club(club_id: PydanticObjectId) -> Club:
        """Get a club by ID."""
        # Fetch links here to ensure consistency before formatting
        club = await Club.get(club_id, fetch_links=True)
        if not club:
            raise HTTPException(status_code=404, detail="Club not found")
        return club

    @staticmethod
    async def get_clubs(
        skip: int = 0,
        limit: int = 20,
        media_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Club], int]:
        """Get all clubs with optional filtering."""
        query = {}
        if media_type:
            query["media_type"] = media_type
        if search:
            # Assuming a text index exists on relevant fields (e.g., name, description)
            query["$text"] = {"$search": search}

        # Apply fetch_links directly to the find query
        find_query = Club.find(query, fetch_links=True)
        
        total = await find_query.count()
        clubs = await find_query.sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
        return clubs, total

    @staticmethod
    async def get_user_clubs(user: User, skip: int = 0, limit: int = 20) -> Tuple[List[Club], int]:
        """Get all clubs a user is a member of."""
        query = {"members._id": user.id}
        # Apply fetch_links directly to the find query
        find_query = Club.find(query, fetch_links=True)
        
        total = await find_query.count()
        clubs = await find_query.sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
        return clubs, total

    @staticmethod
    async def get_created_clubs(user: User, skip: int = 0, limit: int = 20) -> Tuple[List[Club], int]:
        """Get all clubs created by a user."""
        logger.debug(f"[Service] Getting created clubs for user ID: {user.id} (Skip: {skip}, Limit: {limit})")
        query = {"creator._id": user.id}
        logger.debug(f"[Service] Database query for created clubs: {query}")
        
        try:
            # Apply fetch_links directly to the find query
            find_query = Club.find(query, fetch_links=True)
            
            total = await find_query.count()
            logger.debug(f"[Service] Found total {total} created clubs matching query.")
            clubs = await find_query.sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
            logger.debug(f"[Service] Fetched {len(clubs)} created clubs after skip/limit.")
            fetched_club_names = [c.name for c in clubs]
            logger.debug(f"[Service] Fetched created club names: {fetched_club_names}")
            return clubs, total
        except Exception as e:
             logger.error(f"[Service] Error fetching created clubs from DB: {e}", exc_info=True)
             raise

    @staticmethod
    async def join_club(club_id: PydanticObjectId, user: User) -> Club:
        """Join a club."""
        club = await ClubService.get_club(club_id)
        
        # Check if user is already a member by fetching all members first
        member_ids = []
        if club.members:
             try:
                 fetched_members = await asyncio.gather(*[member.fetch() for member in club.members if hasattr(member, 'fetch')])
                 member_ids = [str(m.id) for m in fetched_members if m] # Get IDs of successfully fetched members
                 # Also consider members that might already be resolved
                 for member in club.members:
                      if isinstance(member, User) and str(member.id) not in member_ids:
                          member_ids.append(str(member.id))
             except Exception as e:
                  logger.error(f"Error fetching members during join check for club {club_id}: {e}", exc_info=True)
                  # Decide how to handle - potentially raise 500 or proceed cautiously
                  raise HTTPException(status_code=500, detail="Failed to verify membership status")

        if str(user.id) in member_ids:
             raise HTTPException(status_code=400, detail="Already a member of this club")

        # Use $addToSet to add the user link directly in the database
        try:
            # Construct the DBRef manually for the update operation
            user_dbref = {
                "$ref": User.Settings.name, # Get collection name from User model settings
                "$id": user.id
            }
            await club.update({"$addToSet": {"members": user_dbref}})
            logger.info(f"User {user.id} successfully added to club {club_id} members via $addToSet.")

        except Exception as e:
             logger.error(f"Failed to update club {club_id} using $addToSet for member {user.id}: {e}", exc_info=True)
             raise HTTPException(status_code=500, detail="Failed to update membership")

        # Re-fetch the club with links after the update to return the latest state
        updated_club = await ClubService.get_club(club_id)
        if not updated_club:
             logger.error(f"Failed to re-fetch club {club_id} after joining (using $addToSet).")
             # This shouldn't happen if the update succeeded, but handle defensively.
             raise HTTPException(status_code=404, detail="Club not found after update.")
             
        return updated_club # Return the newly fetched club

    @staticmethod
    async def leave_club(club_id: PydanticObjectId, user: User) -> Club:
        """Leave a club."""
        print(f"DEBUG - Leave club: Attempting to leave club {club_id} for user {user.id}")
        club = await ClubService.get_club(club_id)
        
        # Get creator object (already fetched by get_club)
        creator = club.creator # Directly use the fetched creator object
        if not creator:
             # Handle case where creator link might be broken or null
             logger.error(f"Club {club_id} is missing creator information.")
             raise HTTPException(status_code=500, detail="Club creator information missing.")
             
        print(f"DEBUG - Leave club: Creator ID = {creator.id}, User ID = {user.id}")
        
        # Check if user is the creator
        if str(user.id) == str(creator.id):
            print(f"DEBUG - Leave club: User is creator, cannot leave")
            raise HTTPException(status_code=400, detail="Creator cannot leave the club")
            
        # Check if user is a member and remove them
        user_id_str = str(user.id)
        original_member_count = len(club.members)
        print(f"DEBUG - Leave club: Original member count = {original_member_count}")
        
        # Get member IDs for debugging
        member_ids = []
        for member in club.members:
            if isinstance(member, Link):
                member_ids.append(str(member.ref.id))
            else:
                member_ids.append(str(member.id))
        print(f"DEBUG - Leave club: Current members = {member_ids}")
        
        # Remove the member using ref.id for Link objects
        club.members = [
            member for member in club.members 
            if (isinstance(member, Link) and str(member.ref.id) != user_id_str) or
               (not isinstance(member, Link) and str(member.id) != user_id_str)
        ]
        
        # If member count didn't change, user wasn't a member
        if len(club.members) == original_member_count:
            print(f"DEBUG - Leave club: Member count didn't change, user not found in members list")
            raise HTTPException(status_code=400, detail="Not a member of this club")

        print(f"DEBUG - Leave club: New member count = {len(club.members)}")
        await club.save()
        return club

    @staticmethod
    async def create_post(club_id: PydanticObjectId, user: User, content: str) -> ClubPost:
        """Create a new post in a club."""
        club = await ClubService.get_club(club_id)
        
        # Fetch members to properly check membership
        members = await asyncio.gather(*[member.fetch() for member in club.members])
        member_ids = [str(member.id) for member in members]
        
        if str(user.id) not in member_ids:
            raise HTTPException(status_code=403, detail="You must be a member to post")

        post = ClubPost(
            club=Link(club, Club),
            author=Link(user, User),
            content=content,
        )
        await post.insert()
        return post

    @staticmethod
    async def get_club_posts(
        club_id: PydanticObjectId,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[ClubPost], int]:
        """Get all posts in a club."""
        query = {"club.id": club_id}
        sort = [("is_pinned", -1), ("created_at", -1)]  # Pinned posts first, then newest
        
        total = await ClubPost.find(query).count()
        posts = await ClubPost.find(query).sort(sort).skip(skip).limit(limit).to_list()
        return posts, total

    @staticmethod
    async def delete_club(club_id: PydanticObjectId, user: User) -> None:
        """Delete a club and all its posts."""
        club = await ClubService.get_club(club_id)
        
        # Fetch the creator to properly compare IDs (already fetched by get_club)
        creator = club.creator # Use the fetched object directly
        if not creator:
             # Handle case where creator link might be broken or null
             logger.error(f"Club {club_id} is missing creator information for deletion check.")
             raise HTTPException(status_code=500, detail="Club creator information missing.")

        print(f"DEBUG - Delete club: user.id={user.id}, creator.id={creator.id}")
        
        if str(user.id) != str(creator.id):
            raise HTTPException(status_code=403, detail="Only the creator can delete the club")

        # Delete all posts in the club
        deleted_posts = await ClubPost.find({"club.id": club_id}).delete()
        print(f"DEBUG - Deleted {deleted_posts} posts")
        
        # Delete the club
        await club.delete()
        print(f"DEBUG - Club {club_id} deleted successfully")

    @staticmethod
    async def update_club(
        club_id: PydanticObjectId,
        user: User,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_private: Optional[bool] = None,
    ) -> Club:
        """Update club details."""
        club = await ClubService.get_club(club_id)
        
        if user.id != club.creator.id:
            raise HTTPException(status_code=403, detail="Only the creator can update the club")

        if name is not None:
            club.name = name
        if description is not None:
            club.description = description
        if is_private is not None:
            club.is_private = is_private
            
        club.updated_at = datetime.utcnow()
        await club.save()
        return club

    @staticmethod
    async def create_milestone(
        club_id: PydanticObjectId,
        creator: User,
        title: str,
        milestone_date: datetime,
        description: Optional[str] = None,
    ) -> ClubMilestone:
        """Create a new milestone for a club."""
        # Get the club to verify it exists
        club = await ClubService.get_club(club_id)
        
        # Verify user is the creator
        if creator.id != club.creator.id:
            raise HTTPException(status_code=403, detail="Only the club creator can add milestones")
        
        # Create the milestone
        milestone = ClubMilestone(
            club=Link(club, Club),
            creator=Link(creator, User),
            title=title,
            description=description,
            milestone_date=milestone_date,
        )
        
        await milestone.insert()
        return milestone
    
    @staticmethod
    async def get_club_milestones(
        club_id: PydanticObjectId,
    ) -> List[ClubMilestone]:
        """Get all milestones for a club."""
        # Verify the club exists
        club = await ClubService.get_club(club_id)
        
        # Get the milestones
        query = {"club.id": club_id}
        sort = [("milestone_date", 1)]  # Sort by date ascending
        
        milestones = await ClubMilestone.find(query).sort(sort).to_list()
        return milestones
    
    @staticmethod
    async def create_threads_for_book(
        club_id: PydanticObjectId,
        creator: User,
        book_title: str,
    ) -> List[ClubThread]:
        """Create discussion threads for a book club."""
        # Get the club to verify it exists
        club = await ClubService.get_club(club_id)
        
        # Verify user is the creator/moderator
        if str(creator.id) != str(club.creator.id):
            raise HTTPException(status_code=403, detail="Only moderators can create discussion threads")
        
        # Generate mock chapters based on the book title
        # In a real application, this would come from a book API or database
        chapter_count = min(10 + len(book_title) % 10, 20)  # Between 10-20 chapters
        
        threads = []
        order = 0
        
        # Create chapter threads
        for i in range(1, chapter_count + 1):
            title = f"Chapter {i}: {book_title[i % len(book_title)].upper() + book_title[(i+1) % len(book_title):(i+6) % len(book_title)].lower()}"
            thread = ClubThread(
                club=Link(club, Club),
                creator=Link(creator, User),
                title=title,
                thread_type="chapter",
                chapter_number=i,
                order=order,
            )
            await thread.insert()
            threads.append(thread)
            order += 1
        
        # Create special threads
        special_threads = ["Author's Note", "Glossary", "Reflection"]
        for title in special_threads:
            thread = ClubThread(
                club=Link(club, Club),
                creator=Link(creator, User),
                title=title,
                thread_type="general",
                order=order,
            )
            await thread.insert()
            threads.append(thread)
            order += 1
        
        return threads
    
    @staticmethod
    async def get_club_threads(
        club_id: PydanticObjectId,
    ) -> List[ClubThread]:
        """Get all discussion threads for a club."""
        # Verify the club exists
        club = await ClubService.get_club(club_id)
        
        # Get the threads
        query = {"club.id": club_id}
        sort = [("order", 1)]  # Sort by order
        
        threads = await ClubThread.find(query).sort(sort).to_list()
        return threads 