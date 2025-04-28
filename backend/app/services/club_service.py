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

        # Create club object without members initially
        club = Club(
            name=name,
            description=description,
            creator=Link(creator, User),
            media_type=media_type,
            is_private=is_private,
            cover_image=cover_image,
            book_title=book_title,
            book_author=book_author,
            book_cover=book_cover,
            book_id=book_id,
            # members field is omitted here
        )
        
        # Insert the basic club document
        await club.insert()
        logger.info(f"Inserted basic club {club.id} for {name}")

        # Now, update the document to set the initial members list using the class method
        creator_link_ref = Link(creator, User).to_ref()
        try:
            # Use the class method find_one and update
            update_result = await Club.find_one(Club.id == club.id).update(
                {"$set": {Club.members: [creator_link_ref]}}
            )
            # Check if the update operation found and modified the document
            # Note: Beanie's update result might differ; logging raw result might be helpful
            # Assuming update_result has attributes like matched_count and modified_count
            # based on pymongo's UpdateResult. Adjust if Beanie provides a different structure.
            # logger.info(f"Club {club.id}: Update result: {update_result}") # Optional: Log raw result
            
            # Check if a document was matched and modified. 
            # The exact structure of update_result might depend on the Beanie/Motor version.
            # We'll assume a simple check for now.
            # A more robust check might involve inspecting update_result contents if available.
            if update_result: # Simplified check, assumes non-None/empty means success
                 logger.info(f"Club {club.id}: Successfully $set initial members list via class method.")
            else:
                 # This case means the find_one query didn't find the club right after insertion, which is odd.
                 logger.warning(f"Club {club.id}: Class method update didn't seem to modify the document.")
                 # Consider raising an error here as it indicates a potential problem.
                 # raise HTTPException(status_code=500, detail="Failed to find club immediately after insertion for member update.")

        except Exception as e:
             logger.error(f"Club {club.id}: Failed to $set initial members list via class method: {e}", exc_info=True)
             # Decide if we should raise an error or return the partially created club
             # For now, let's re-raise to make the failure explicit
             raise HTTPException(status_code=500, detail="Failed to set initial club members after creation.")

        # Removed the re-fetch step. We will return the initial club object.
        # The format_club_response function called by the route handler will fetch links.
        # try:
        #     # Use the class method directly which includes the not found check
        #     created_club = await ClubService.get_club(club.id) 
        #     logger.info(f"Successfully re-fetched club {created_club.id} after setting members.")
        #     # Add a check to see if members are present in the re-fetched object
        #     if not created_club.members:
        #          logger.warning(f"Club {created_club.id}: Re-fetched club is missing the members list!")
        #     elif str(created_club.members[0].ref.id) != str(creator.id):
        #          logger.warning(f"Club {created_club.id}: Re-fetched club members list doesn't contain the creator! Members: {created_club.members}")
        #     return created_club
        # except HTTPException as he:
        #      # If get_club raised 404, it means the club disappeared between update and re-fetch
        #      logger.error(f"Club {club.id}: Failed to re-fetch club after setting members (HTTPException: {he.status_code} - {he.detail})")
        #      raise he # Re-raise the original HTTPException
        # except Exception as e:
        #      logger.error(f"Club {club.id}: Failed to re-fetch club after setting members: {e}", exc_info=True)
        #      raise HTTPException(status_code=500, detail="Failed to re-fetch club after creation.")
        
        return club # Return the original club instance

    @staticmethod
    async def get_club(club_id: PydanticObjectId) -> Club:
        """Get a club by ID."""
        club = await Club.get(club_id)
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
            query["$text"] = {"$search": search}

        total = await Club.find(query).count()
        clubs = await Club.find(query).sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
        return clubs, total

    @staticmethod
    async def get_user_clubs(user: User, skip: int = 0, limit: int = 20) -> Tuple[List[Club], int]:
        """Get all clubs a user is a member of."""
        # Fetch clubs where user is a member
        # For Link objects, MongoDB stores them as {"_id": user_id, "_ref": "User"}
        query = {"members._id": user.id}
        total = await Club.find(query).count()
        clubs = await Club.find(query).skip(skip).limit(limit).to_list()
        return clubs, total

    @staticmethod
    async def get_created_clubs(user: User, skip: int = 0, limit: int = 20) -> Tuple[List[Club], int]:
        """Get all clubs created by a user."""
        logger.debug(f"[Service] Getting created clubs for user ID: {user.id} (Skip: {skip}, Limit: {limit})")
        # Fetch clubs where user is the creator
        query = {"creator._id": user.id}
        logger.debug(f"[Service] Database query for created clubs: {query}")
        
        try:
            total = await Club.find(query).count()
            logger.debug(f"[Service] Found total {total} created clubs matching query.")
            clubs = await Club.find(query).sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
            logger.debug(f"[Service] Fetched {len(clubs)} created clubs after skip/limit.")
            # Log the names of the fetched clubs
            fetched_club_names = [c.name for c in clubs]
            logger.debug(f"[Service] Fetched created club names: {fetched_club_names}")
            return clubs, total
        except Exception as e:
             logger.error(f"[Service] Error fetching created clubs from DB: {e}", exc_info=True)
             raise # Re-raise the exception after logging

    @staticmethod
    async def join_club(club_id: PydanticObjectId, user: User) -> Club:
        """Join a club."""
        club = await ClubService.get_club(club_id)
        
        # Check if user is already a member
        for member in club.members:
            if hasattr(member, 'fetch'):
                fetched_member = await member.fetch()
                if str(fetched_member.id) == str(user.id):
                    raise HTTPException(status_code=400, detail="Already a member of this club")
            elif str(member.id) == str(user.id):
                raise HTTPException(status_code=400, detail="Already a member of this club")

        # Create the Link object
        user_link = Link(user, User)
        
        # Add user as a member using $push with the DBRef structure
        await club.update({"$push": {Club.members: user_link.to_ref()}})
        # await club.save() # <-- Replaced with explicit update

        # Re-fetch the club after saving to ensure the latest state is returned
        updated_club = await ClubService.get_club(club_id)
        if not updated_club:
             # This case should ideally not happen if the club existed moments ago
             logger.error(f"Failed to re-fetch club {club_id} after joining.")
             raise HTTPException(status_code=404, detail="Club not found after update.")
             
        return updated_club

    @staticmethod
    async def leave_club(club_id: PydanticObjectId, user: User) -> Club:
        """Leave a club."""
        print(f"DEBUG - Leave club: Attempting to leave club {club_id} for user {user.id}")
        club = await ClubService.get_club(club_id)
        
        # Get creator ID by fetching the creator first
        creator = await club.creator.fetch()
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
        
        # Fetch the creator to properly compare IDs
        creator = await club.creator.fetch()
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