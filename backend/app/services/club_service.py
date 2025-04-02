from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from beanie import PydanticObjectId, Link
from fastapi import HTTPException
import asyncio

from ..database.models.club import Club
from ..database.models.club_post import ClubPost
from ..database.models.user import User
from ..database.models.club_milestone import ClubMilestone
from ..database.models.club_thread import ClubThread

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
    ) -> Club:
        """Create a new club."""
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
        )
        
        # Add creator as a member
        club.members = [Link(creator, User)]
        
        await club.insert()
        return club

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
        clubs = await Club.find(query).skip(skip).limit(limit).to_list()
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
        # Fetch clubs where user is the creator
        query = {"creator._id": user.id}
        total = await Club.find(query).count()
        clubs = await Club.find(query).skip(skip).limit(limit).to_list()
        return clubs, total

    @staticmethod
    async def join_club(club_id: PydanticObjectId, user: User) -> Club:
        """Join a club."""
        club = await ClubService.get_club(club_id)
        
        # Fetch all member users
        members = await asyncio.gather(*[member.fetch() for member in club.members])
        member_ids = [member.id for member in members]
        
        if user.id in member_ids:
            raise HTTPException(status_code=400, detail="Already a member of this club")

        # Add user as a member
        club.members.append(Link(user, User))
        await club.save()
        return club

    @staticmethod
    async def leave_club(club_id: PydanticObjectId, user: User) -> Club:
        """Leave a club."""
        club = await ClubService.get_club(club_id)
        
        # Fetch creator and members
        creator = await club.creator.fetch()
        members = await asyncio.gather(*[member.fetch() for member in club.members])
        member_ids = [member.id for member in members]
        
        if user.id == creator.id:
            raise HTTPException(status_code=400, detail="Creator cannot leave the club")
            
        if user.id not in member_ids:
            raise HTTPException(status_code=400, detail="Not a member of this club")

        # Filter members to remove the user's Link
        club.members = [member for member in club.members if member.id != user.id]
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
        
        # Verify user is the creator
        if creator.id != club.creator.id:
            raise HTTPException(status_code=403, detail="Only the club creator can create threads")
        
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

    async def generate_book_threads(self, club: Club, current_user: User) -> None:
        """Generate discussion threads for each chapter of a book"""
        # First, check if this is a book club
        if club.media_type != "book" or not club.book_title:
            return
            
        # Delete existing auto-generated threads
        await ClubThread.find(
            {"club_id": club.id, "is_auto_generated": True}
        ).delete_all()
        
        # Simple chapter generation (we can make this more sophisticated)
        # For now, create 10 chapter threads + special threads
        threads_to_create = []
        
        # Add special threads first
        special_threads = [
            {"title": "Author's Note", "description": f"Discuss the author's perspective on {club.book_title}"},
            {"title": "Introduction", "description": f"Start your journey with {club.book_title}"},
            {"title": "Glossary", "description": "Key terms and concepts from the book"},
        ]
        
        for thread in special_threads:
            threads_to_create.append(
                ClubThread(
                    club_id=club.id,
                    creator_id=current_user.id,
                    title=thread["title"],
                    description=thread["description"],
                    is_auto_generated=True
                )
            )
        
        # Add chapter threads
        for i in range(1, 11):  # 10 chapters
            threads_to_create.append(
                ClubThread(
                    club_id=club.id,
                    creator_id=current_user.id,
                    title=f"Chapter {i}",
                    description=f"Discussion for Chapter {i} of {club.book_title}",
                    is_auto_generated=True
                )
            )
            
        # Add final "reflection" thread
        threads_to_create.append(
            ClubThread(
                club_id=club.id,
                creator_id=current_user.id,
                title="Reflection",
                description=f"Share your final thoughts on {club.book_title}",
                is_auto_generated=True
            )
        )
        
        # Insert all threads
        for thread in threads_to_create:
            await thread.create()
            
        # Create a milestone for starting the book
        today = datetime.now()
        start_milestone = ClubMilestone(
            club_id=club.id,
            title=f"Start reading {club.book_title}",
            description=f"Begin your journey with {club.book_title} by {club.book_author}",
            date=today,
            creator_id=current_user.id,
            is_auto_generated=True
        )
        await start_milestone.create()
        
        # Create a milestone for finishing the book (30 days later)
        from datetime import timedelta
        end_date = today + timedelta(days=30)
        end_milestone = ClubMilestone(
            club_id=club.id,
            title=f"Finish {club.book_title}",
            description=f"Complete reading {club.book_title} and join the reflection discussion",
            date=end_date,
            creator_id=current_user.id,
            is_auto_generated=True
        )
        await end_milestone.create() 