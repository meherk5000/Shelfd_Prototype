"""
Club Service for Shelfd API

This module handles all functionality related to clubs (reading/watching groups) in the application:
1. Creating and managing clubs for books, movies, and TV shows
2. Handling club membership (joining, leaving)
3. Managing club posts and discussions
4. Creating and tracking milestones for group reading/watching

Clubs are a social feature that allows users to read books or watch movies/shows together
and discuss them in a structured environment.
"""

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
    """
    Service class for handling club-related operations
    
    Clubs are social groups where users can come together to discuss media.
    This service provides methods for creating and managing clubs, handling
    membership, and facilitating discussions through posts and threads.
    
    Key features:
    - Book, movie, and TV show clubs
    - Member management
    - Posts and discussions
    - Reading/watching milestones
    - Threaded discussions for chapters or topics
    """
    
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
        """
        Create a new club.
        
        Creates a new club with the specified creator as both the owner and the first member.
        Clubs can be created for books, movies, or TV shows and can be public or private.
        
        Args:
            name: The name of the club
            creator: The User object of the club creator
            media_type: Type of media ("book", "movie", or "tv")
            description: Optional description of the club
            is_private: Whether the club is private (invite only)
            cover_image: Optional URL for club cover image
            book_title: Optional title of the book (for book clubs)
            book_author: Optional author of the book
            book_cover: Optional URL for book cover image
            book_id: Optional ID of the book
            
        Returns:
            The created Club object
            
        Raises:
            HTTPException: If the media type is invalid or club creation fails
        """
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

            # Re-fetch the club to ensure we have the latest state
            # This helps prevent issues with MongoDB replication lag
            await asyncio.sleep(0.5) # Small delay for potential DB replication lag
            fetched_club = await ClubService.get_club(club.id)
            if not fetched_club:
                logger.error(f"[Service] Failed to re-fetch club {club.id} immediately after creation.")
                raise HTTPException(status_code=500, detail="Failed to retrieve club details after creation within service.")
            
            logger.info(f"[Service] Re-fetched club {fetched_club.id} after creation (using get_club). Members: {fetched_club.members}")
            return fetched_club # Return the fetched object with all links properly set up

        except Exception as e:
             club_id_str = str(club.id) if hasattr(club, 'id') and club.id else "UNKNOWN_ID"
             logger.error(f"Club {club_id_str}: Failed during club.create() or re-fetch: {e}", exc_info=True)
             raise HTTPException(status_code=500, detail=f"Failed to create club: {str(e)}")

    @staticmethod
    async def get_club(club_id: PydanticObjectId) -> Club:
        """
        Get a club by ID.
        
        Retrieves a club by its ID, including all linked objects like creator and members.
        
        Args:
            club_id: The ObjectId of the club to retrieve
            
        Returns:
            The Club object with all links fetched
            
        Raises:
            HTTPException: If the club is not found
        """
        # Fetch links here to ensure we have related data like creator and members
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
        """
        Get all clubs with optional filtering.
        
        Retrieves a list of clubs with pagination and optional filtering by media type
        and text search. This is used for the public club discovery page.
        
        Args:
            skip: Number of clubs to skip (for pagination)
            limit: Maximum number of clubs to return
            media_type: Optional filter by type ("book", "movie", "tv")
            search: Optional text search query
            
        Returns:
            Tuple of (list of clubs, total count)
        """
        # Build query based on filters
        query = {}
        if media_type:
            query["media_type"] = media_type
        if search:
            # Use MongoDB text search if a search term is provided
            # This requires a text index on relevant fields in the Club collection
            query["$text"] = {"$search": search}

        # Apply fetch_links to get creator and member information
        find_query = Club.find(query, fetch_links=True)
        
        # Get total count for pagination
        total = await find_query.count()
        
        # Get clubs with pagination, sorted by creation date (newest first)
        clubs = await find_query.sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
        return clubs, total

    @staticmethod
    async def get_user_clubs(user: User, skip: int = 0, limit: int = 20) -> Tuple[List[Club], int]:
        """
        Get all clubs a user is a member of.
        
        Retrieves a list of clubs that the user has joined, with pagination.
        This is used for the "My Clubs" page.
        
        Args:
            user: The User object
            skip: Number of clubs to skip (for pagination)
            limit: Maximum number of clubs to return
            
        Returns:
            Tuple of (list of clubs, total count)
        """
        # Query for clubs where the user is in the members list
        query = {"members._id": user.id}
        
        # Apply fetch_links to get creator and member information
        find_query = Club.find(query, fetch_links=True)
        
        # Get total count for pagination
        total = await find_query.count()
        
        # Get clubs with pagination, sorted by creation date (newest first)
        clubs = await find_query.sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
        return clubs, total

    @staticmethod
    async def get_created_clubs(user: User, skip: int = 0, limit: int = 20) -> Tuple[List[Club], int]:
        """
        Get all clubs created by a user.
        
        Retrieves a list of clubs that the user has created, with pagination.
        This is used in user profiles to show clubs they manage.
        
        Args:
            user: The User object
            skip: Number of clubs to skip (for pagination)
            limit: Maximum number of clubs to return
            
        Returns:
            Tuple of (list of clubs, total count)
        """
        logger.debug(f"[Service] Getting created clubs for user ID: {user.id} (Skip: {skip}, Limit: {limit})")
        
        # Query for clubs where the user is the creator
        query = {"creator._id": user.id}
        logger.debug(f"[Service] Database query for created clubs: {query}")
        
        try:
            # Apply fetch_links to get creator and member information
            find_query = Club.find(query, fetch_links=True)
            
            # Get total count for pagination
            total = await find_query.count()
            logger.debug(f"[Service] Found total {total} created clubs matching query.")
            
            # Get clubs with pagination, sorted by creation date (newest first)
            clubs = await find_query.sort([("created_at", -1)]).skip(skip).limit(limit).to_list()
            logger.debug(f"[Service] Fetched {len(clubs)} created clubs after skip/limit.")
            
            # Debug information
            fetched_club_names = [c.name for c in clubs]
            logger.debug(f"[Service] Fetched created club names: {fetched_club_names}")
            
            return clubs, total
        except Exception as e:
             logger.error(f"[Service] Error fetching created clubs from DB: {e}", exc_info=True)
             raise

    @staticmethod
    async def join_club(club_id: PydanticObjectId, user: User) -> Club:
        """
        Join a club.
        
        Adds a user to a club's member list. This checks if the user is already
        a member to prevent duplicates.
        
        Args:
            club_id: The ID of the club to join
            user: The User object of the person joining
            
        Returns:
            The updated Club object
            
        Raises:
            HTTPException: If user is already a member or operation fails
        """
        # Get the club with its current members
        club = await ClubService.get_club(club_id)
        
        # Check if user is already a member by fetching all members
        member_ids = []
        if club.members:
             try:
                 # Fetch all member objects to get their IDs
                 fetched_members = await asyncio.gather(*[member.fetch() for member in club.members if hasattr(member, 'fetch')])
                 member_ids = [str(m.id) for m in fetched_members if m] # Get IDs of successfully fetched members
                 
                 # Also consider members that might already be resolved
                 for member in club.members:
                      if isinstance(member, User) and str(member.id) not in member_ids:
                          member_ids.append(str(member.id))
             except Exception as e:
                  logger.error(f"Error fetching members during join check for club {club_id}: {e}", exc_info=True)
                  raise HTTPException(status_code=500, detail="Failed to verify membership status")

        # Check if user is already a member
        if str(user.id) in member_ids:
             raise HTTPException(status_code=400, detail="Already a member of this club")

        # Use $addToSet to add the user to the members array without duplicates
        try:
            # Construct the DBRef manually for the update operation
            # This creates a reference to the User document in the database
            user_dbref = {
                "$ref": User.Settings.name, # Get collection name from User model settings
                "$id": user.id
            }
            # Update the club document directly in the database
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
             
        return updated_club # Return the newly fetched club with updated members list

    @staticmethod
    async def leave_club(club_id: PydanticObjectId, user: User) -> Club:
        """
        Leave a club.
        
        Removes a user from a club's member list. The creator cannot leave their own club.
        
        Args:
            club_id: The ID of the club to leave
            user: The User object of the person leaving
            
        Returns:
            The updated Club object
            
        Raises:
            HTTPException: If user is the creator, not a member, or operation fails
        """
        club = await ClubService.get_club(club_id)
        
        # Get creator object (already fetched by get_club)
        creator = club.creator # Directly use the fetched creator object
        if not creator:
             # Handle case where creator link might be broken or null
             logger.error(f"Club {club_id} is missing creator information.")
             raise HTTPException(status_code=500, detail="Club creator information missing.")
             
        # Check if user is the creator - creators cannot leave their own clubs
        if str(user.id) == str(creator.id):
            logger.error(f"Club {club_id}: User is creator, cannot leave")
            raise HTTPException(status_code=400, detail="Creator cannot leave the club")
            
        # Check if user is a member and remove them
        user_id_str = str(user.id)
        original_member_count = len(club.members)
        
        # Get member IDs for debugging
        member_ids = []
        for member in club.members:
            if isinstance(member, Link):
                member_ids.append(str(member.ref.id))
            else:
                member_ids.append(str(member.id))
        
        # Remove the member by filtering the members list
        # Handle both Link objects and User objects
        club.members = [
            member for member in club.members 
            if (isinstance(member, Link) and str(member.ref.id) != user_id_str) or
               (not isinstance(member, Link) and str(member.id) != user_id_str)
        ]
        
        # If member count didn't change, user wasn't a member
        if len(club.members) == original_member_count:
            logger.error(f"Club {club_id}: Member count didn't change, user not found in members list")
            raise HTTPException(status_code=400, detail="Not a member of this club")

        # Save the updated club document
        await club.save()
        return club

    @staticmethod
    async def create_post(club_id: PydanticObjectId, user: User, content: str) -> ClubPost:
        """
        Create a new post in a club.
        
        Posts are messages that members can share with the club. Only members
        can create posts in a club.
        
        Args:
            club_id: The ID of the club to post in
            user: The User object of the post author
            content: The text content of the post
            
        Returns:
            The created ClubPost object
            
        Raises:
            HTTPException: If user is not a member of the club or post creation fails
        """
        # Get the club and verify it exists
        club = await ClubService.get_club(club_id)
        
        # Fetch all members to check if user is a member
        members = await asyncio.gather(*[member.fetch() for member in club.members])
        member_ids = [str(member.id) for member in members]
        
        # Only members can post
        if str(user.id) not in member_ids:
            raise HTTPException(status_code=403, detail="You must be a member to post")

        # Create the post
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
        """
        Get all posts in a club.
        
        Retrieves a list of posts for a club with pagination. Pinned posts
        appear first, followed by most recent posts.
        
        Args:
            club_id: The ID of the club
            skip: Number of posts to skip (for pagination)
            limit: Maximum number of posts to return
            
        Returns:
            Tuple of (list of posts, total count)
        """
        # Query for posts in this club
        query = {"club.id": club_id}
        
        # Sort by pinned status first, then by creation date
        sort = [("is_pinned", -1), ("created_at", -1)]  # Pinned posts first, then newest
        
        # Get total count for pagination
        total = await ClubPost.find(query).count()
        
        # Get posts with pagination and sorting
        posts = await ClubPost.find(query).sort(sort).skip(skip).limit(limit).to_list()
        return posts, total

    @staticmethod
    async def delete_club(club_id: PydanticObjectId, user: User) -> None:
        """
        Delete a club and all its posts.
        
        Only the creator of a club can delete it. Deleting a club also deletes
        all posts, threads, and other content associated with it.
        
        Args:
            club_id: The ID of the club to delete
            user: The User object of the person attempting to delete
            
        Raises:
            HTTPException: If user is not the creator or deletion fails
        """
        # Get the club and verify it exists
        club = await ClubService.get_club(club_id)
        
        # Fetch the creator to properly compare IDs (already fetched by get_club)
        creator = club.creator # Use the fetched object directly
        if not creator:
             # Handle case where creator link might be broken or null
             logger.error(f"Club {club_id} is missing creator information for deletion check.")
             raise HTTPException(status_code=500, detail="Club creator information missing.")

        # Only the creator can delete the club
        if str(user.id) != str(creator.id):
            raise HTTPException(status_code=403, detail="Only the creator can delete the club")

        # Delete all posts in the club
        deleted_posts = await ClubPost.find({"club.id": club_id}).delete()
        
        # Delete the club itself
        await club.delete()

    @staticmethod
    async def update_club(
        club_id: PydanticObjectId,
        user: User,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_private: Optional[bool] = None,
    ) -> Club:
        """
        Update club details.
        
        Allows the creator to update the club's name, description, or privacy setting.
        Only the creator can update club details.
        
        Args:
            club_id: The ID of the club to update
            user: The User object of the person attempting the update
            name: Optional new name for the club
            description: Optional new description
            is_private: Optional new privacy setting
            
        Returns:
            The updated Club object
            
        Raises:
            HTTPException: If user is not the creator or update fails
        """
        # Get the club and verify it exists
        club = await ClubService.get_club(club_id)
        
        # Only the creator can update the club
        if user.id != club.creator.id:
            raise HTTPException(status_code=403, detail="Only the creator can update the club")

        # Update only the provided fields
        if name is not None:
            club.name = name
        if description is not None:
            club.description = description
        if is_private is not None:
            club.is_private = is_private
            
        # Update the modification timestamp
        club.updated_at = datetime.utcnow()
        
        # Save the changes
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
        """
        Create a new milestone for a club.
        
        Milestones are scheduled events or goals for the club, such as 
        "Finish Chapters 1-5 by Saturday" or "Group watch party on Friday".
        Only the club creator can add milestones.
        
        Args:
            club_id: The ID of the club
            creator: The User object of the milestone creator (must be club creator)
            title: The title of the milestone
            milestone_date: The date when the milestone should be reached
            description: Optional description of the milestone
            
        Returns:
            The created ClubMilestone object
            
        Raises:
            HTTPException: If user is not the club creator or milestone creation fails
        """
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
        """
        Get all milestones for a club.
        
        Retrieves all milestones for a club, sorted by date (earliest first).
        
        Args:
            club_id: The ID of the club
            
        Returns:
            List of ClubMilestone objects
            
        Raises:
            HTTPException: If the club doesn't exist
        """
        # Verify the club exists
        club = await ClubService.get_club(club_id)
        
        # Get the milestones
        query = {"club.id": club_id}
        sort = [("milestone_date", 1)]  # Sort by date ascending (earliest first)
        
        milestones = await ClubMilestone.find(query).sort(sort).to_list()
        return milestones
    
    @staticmethod
    async def create_threads_for_book(
        club_id: PydanticObjectId,
        creator: User,
        book_title: str,
    ) -> List[ClubThread]:
        """
        Create discussion threads for a book club.
        
        This automatically generates discussion threads for each chapter of a book,
        plus some general discussion threads. Only the club creator can create threads.
        
        Args:
            club_id: The ID of the book club
            creator: The User object of the thread creator (must be club creator)
            book_title: The title of the book
            
        Returns:
            List of created ClubThread objects
            
        Raises:
            HTTPException: If user is not club creator or thread creation fails
        """
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
        
        # Create chapter threads (one for each chapter)
        for i in range(1, chapter_count + 1):
            # Generate a mock chapter title using characters from the book title
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
        
        # Create special thread categories for general discussion
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
        """
        Get all discussion threads for a club.
        
        Retrieves all threads for a club, sorted by their defined order.
        
        Args:
            club_id: The ID of the club
            
        Returns:
            List of ClubThread objects
            
        Raises:
            HTTPException: If the club doesn't exist
        """
        # Verify the club exists
        club = await ClubService.get_club(club_id)
        
        # Get the threads
        query = {"club.id": club_id}
        sort = [("order", 1)]  # Sort by order (as defined when created)
        
        threads = await ClubThread.find(query).sort(sort).to_list()
        return threads 