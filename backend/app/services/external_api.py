# app/services/external_api.py
"""
External API Service

This module handles all interactions with third-party APIs used by Shelfd:
- TMDB (The Movie Database) for movies and TV shows data
- Google Books API for book data

Each function wraps an external API call with proper error handling and response processing.
These external integrations allow Shelfd to provide rich media information without
maintaining a large media database itself.
"""
from typing import Dict, Optional, List
import httpx
from fastapi import HTTPException
import os

async def search_movies(query: str, page: int = 1) -> Dict:
    """
    Search for movies using TMDB API
    
    Parameters:
        query (str): The search term entered by the user
        page (int): The page number for pagination (TMDB returns 20 results per page)
        
    Returns:
        Dict: JSON response from TMDB containing movie search results
        
    Raises:
        HTTPException: If the API request fails or configuration is missing
    """
    tmdb_base_url = os.getenv("TMDB_BASE_URL")
    tmdb_api_key = os.getenv("TMDB_API_KEY")
    
    # Check that required environment variables are set
    if not tmdb_base_url or not tmdb_api_key:
        raise HTTPException(status_code=500, detail="TMDB configuration missing")
    
    # Use httpx for async HTTP requests
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/search/movie",
            params={
                "api_key": tmdb_api_key,
                "query": query,
                "page": page
            }
        )
        if response.status_code == 200:
            return response.json()
        # If the request failed, raise an exception
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch movies")

async def search_tv_shows(query: str, page: int = 1) -> Dict:
    """
    Search for TV shows using TMDB API
    
    Parameters:
        query (str): The search term entered by the user
        page (int): The page number for pagination (TMDB returns 20 results per page)
        
    Returns:
        Dict: JSON response from TMDB containing TV show search results
        
    Raises:
        HTTPException: If the API request fails or configuration is missing
    """
    tmdb_base_url = os.getenv("TMDB_BASE_URL")
    tmdb_api_key = os.getenv("TMDB_API_KEY")
    
    # Check that required environment variables are set
    if not tmdb_base_url or not tmdb_api_key:
        raise HTTPException(status_code=500, detail="TMDB configuration missing")
    
    # Use httpx for async HTTP requests
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/search/tv",
            params={
                "api_key": tmdb_api_key,
                "query": query,
                "page": page
            }
        )
        if response.status_code == 200:
            return response.json()
        # If the request failed, raise an exception
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch TV shows")

async def search_books(query: str, page: int = 1) -> Dict:
    """
    Search for books using Google Books API
    
    Parameters:
        query (str): The search term entered by the user
        page (int): The page number for pagination 
                    (Google Books uses startIndex instead of page)
        
    Returns:
        Dict: JSON response from Google Books containing book search results
        
    Raises:
        HTTPException: If the API request fails or configuration is missing
    """
    google_books_base_url = os.getenv("GOOGLE_BOOKS_BASE_URL")
    
    # Check that required environment variables are set
    if not google_books_base_url:
        raise HTTPException(status_code=500, detail="Google Books configuration missing")
    
    # Use httpx for async HTTP requests
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{google_books_base_url}/volumes",
            params={
                "q": query,
                # Google Books API uses startIndex instead of page number
                # Each page contains 10 results by default
                "startIndex": (page - 1) * 10,
                "maxResults": 10
            }
        )
        if response.status_code == 200:
            return response.json()
        # If the request failed, raise an exception
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch books")

async def get_movie_details(movie_id: int) -> Dict:
    """
    Get detailed information about a specific movie
    
    Parameters:
        movie_id (int): The TMDB ID of the movie
        
    Returns:
        Dict: Detailed movie information including:
             - Basic details (title, release date, runtime, etc.)
             - Credits (cast and crew)
             - Videos (trailers, teasers)
             - Similar movies
        
    Raises:
        HTTPException: If the API request fails or configuration is missing
    """
    tmdb_base_url = os.getenv("TMDB_BASE_URL")
    tmdb_api_key = os.getenv("TMDB_API_KEY")
    
    # Check that required environment variables are set
    if not tmdb_base_url or not tmdb_api_key:
        raise HTTPException(status_code=500, detail="TMDB configuration missing")
    
    # Use httpx for async HTTP requests
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/movie/{movie_id}",
            params={
                "api_key": tmdb_api_key,
                # The append_to_response parameter allows fetching multiple
                # related resources in a single request
                "append_to_response": "credits,videos,similar"
            }
        )
        if response.status_code == 200:
            return response.json()
        # If the request failed, raise an exception
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch movie details")

async def get_tv_details(tv_id: int) -> Dict:
    """
    Get detailed information about a specific TV show
    
    Parameters:
        tv_id (int): The TMDB ID of the TV show
        
    Returns:
        Dict: Detailed TV show information including:
             - Basic details (title, first_air_date, seasons, etc.)
             - Credits (cast and crew)
             - Videos (trailers, teasers)
             - Similar TV shows
        
    Raises:
        HTTPException: If the API request fails or configuration is missing
    """
    tmdb_base_url = os.getenv("TMDB_BASE_URL")
    tmdb_api_key = os.getenv("TMDB_API_KEY")
    
    # Check that required environment variables are set
    if not tmdb_base_url or not tmdb_api_key:
        raise HTTPException(status_code=500, detail="TMDB configuration missing")
    
    # Use httpx for async HTTP requests
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{tmdb_base_url}/tv/{tv_id}",
            params={
                "api_key": tmdb_api_key,
                # The append_to_response parameter allows fetching multiple
                # related resources in a single request
                "append_to_response": "credits,videos,similar"
            }
        )
        if response.status_code == 200:
            return response.json()
        # If the request failed, raise an exception
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch TV show details")

async def get_book_details(book_id: str) -> Dict:
    """
    Get detailed information about a specific book
    
    Parameters:
        book_id (str): The Google Books volume ID
        
    Returns:
        Dict: Detailed book information including:
             - Volume info (title, authors, categories)
             - Publishing details
             - Preview links
             - Cover images
        
    Raises:
        HTTPException: If the API request fails or configuration is missing
    """
    google_books_base_url = os.getenv("GOOGLE_BOOKS_BASE_URL")
    
    # Check that required environment variables are set
    if not google_books_base_url:
        raise HTTPException(status_code=500, detail="Google Books configuration missing")
    
    # Use httpx for async HTTP requests
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{google_books_base_url}/volumes/{book_id}"
        )
        if response.status_code == 200:
            return response.json()
        # If the request failed, raise an exception
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch book details")

# This method appears to be unfinished/legacy code,
# as it references a 'database' object that isn't imported
# It should be removed or properly implemented
async def remove_from_shelf(user_id: str, book_id: str, shelf_type: str):
    """
    Remove a book from a user's shelf
    
    Note: This function appears to be misplaced and may be legacy code.
    It references a 'database' object that isn't imported in this module.
    This should be moved to shelf_service.py.
    
    Parameters:
        user_id (str): The ID of the user
        book_id (str): The ID of the book to remove
        shelf_type (str): The type of shelf (want_to_read, reading, finished)
        
    Returns:
        bool: True if successful
        
    Raises:
        HTTPException: If the database operation fails
    """
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
        print(f"Error removing book from shelf: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove book from shelf")