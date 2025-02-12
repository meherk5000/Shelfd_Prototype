# app/services/external_api.py
from typing import Dict, Optional, List
import httpx
from fastapi import HTTPException
from config import Settings
from database import database
from utils import logger

settings = Settings()

async def search_movies(query: str, page: int = 1) -> Dict:
    """Search for movies using TMDB API"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.tmdb_base_url}/search/movie",
            params={
                "api_key": settings.tmdb_api_key,
                "query": query,
                "page": page
            }
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch movies")

async def search_tv_shows(query: str, page: int = 1) -> Dict:
    """Search for TV shows using TMDB API"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.tmdb_base_url}/search/tv",
            params={
                "api_key": settings.tmdb_api_key,
                "query": query,
                "page": page
            }
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch TV shows")

async def search_books(query: str, page: int = 1) -> Dict:
    """Search for books using Google Books API"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.google_books_base_url}/volumes",
            params={
                "q": query,
                "startIndex": (page - 1) * 10,
                "maxResults": 10
            }
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch books")

async def get_movie_details(movie_id: int) -> Dict:
    """Get detailed information about a specific movie"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.tmdb_base_url}/movie/{movie_id}",
            params={
                "api_key": settings.tmdb_api_key,
                "append_to_response": "credits,videos,similar"
            }
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch movie details")

async def get_tv_details(tv_id: int) -> Dict:
    """Get detailed information about a specific TV show"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.tmdb_base_url}/tv/{tv_id}",
            params={
                "api_key": settings.tmdb_api_key,
                "append_to_response": "credits,videos,similar"
            }
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch TV show details")

async def get_book_details(book_id: str) -> Dict:
    """Get detailed information about a specific book"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.google_books_base_url}/volumes/{book_id}"
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch book details")

async def remove_from_shelf(user_id: str, book_id: str, shelf_type: str):
    """Remove a book from a user's shelf"""
    try:
        query = """
        DELETE FROM user_shelves 
        WHERE user_id = :user_id 
        AND book_id = :book_id 
        AND shelf_type = :shelf_type
        """
        await database.execute(
            query=query,
            values={"user_id": user_id, "book_id": book_id, "shelf_type": shelf_type}
        )
        return True
    except Exception as e:
        logger.error(f"Error removing book from shelf: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove book from shelf")