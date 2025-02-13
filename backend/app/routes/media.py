# app/routes/media.py
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
import httpx
from pydantic import BaseModel
from config import Settings
from app.services.shelf_service import ShelfService
from app.auth.auth_handler import get_current_user

# router = APIRouter(
#     prefix="/media",  # This sets the prefix for all routes in this router
#     tags=["media"]
# )
router = APIRouter()
settings = Settings()

class SearchResult(BaseModel):
    id: str
    title: str
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    year: Optional[str] = None
    type: str

class GroupedSearchResults(BaseModel):
    movies: List[SearchResult]
    tv_shows: List[SearchResult]
    books: List[SearchResult]
    articles: List[SearchResult] = []

@router.get("/search/quick")  # This will become /media/search/quick
async def search_quick(query: str):
    """Quick search across all media types"""
    if not query or len(query) < 2:
        return {
            "movies": [],
            "tv_shows": [],
            "books": [],
            "articles": []
        }
    
    try:
        async with httpx.AsyncClient() as client:
            # Search movies
            movie_response = await client.get(
                f"{settings.TMDB_BASE_URL}/search/movie",
                params={
                    "api_key": settings.TMDB_API_KEY,
                    "query": query,
                    "language": "en-US",
                    "page": 1
                }
            )
            movie_data = movie_response.json()
            
            # Search TV shows
            tv_response = await client.get(
                f"{settings.TMDB_BASE_URL}/search/tv",
                params={
                    "api_key": settings.TMDB_API_KEY,
                    "query": query,
                    "language": "en-US",
                    "page": 1
                }
            )
            tv_data = tv_response.json()
            
            # Search books
            book_response = await client.get(
                f"{settings.GOOGLE_BOOKS_BASE_URL}/volumes",
                params={
                    "q": query,
                    "maxResults": 5
                }
            )
            book_data = book_response.json()

        return {
            "movies": [
                {
                    "id": str(item["id"]),
                    "title": item["title"],
                    "subtitle": item.get("release_date", "")[:4] if item.get("release_date") else None,
                    "image_url": f"https://image.tmdb.org/t/p/w92{item['poster_path']}" if item.get("poster_path") else None,
                    "type": "movie"
                }
                for item in movie_data.get("results", [])[:5]
            ],
            "tv_shows": [
                {
                    "id": str(item["id"]),
                    "title": item["name"],
                    "subtitle": item.get("first_air_date", "")[:4] if item.get("first_air_date") else None,
                    "image_url": f"https://image.tmdb.org/t/p/w92{item['poster_path']}" if item.get("poster_path") else None,
                    "type": "tv"
                }
                for item in tv_data.get("results", [])[:5]
            ],
            "books": [
                {
                    "id": item["id"],
                    "title": item["volumeInfo"]["title"],
                    "subtitle": item["volumeInfo"].get("authors", [""])[0],
                    "image_url": item["volumeInfo"].get("imageLinks", {}).get("thumbnail"),
                    "type": "book"
                }
                for item in book_data.get("items", [])[:5]
            ],
            "articles": []  # Empty for now
        }
            
    except Exception as e:
        print(f"Search error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/books/{book_id}")
async def get_book_details(book_id: str):
    try:
        print(f"Fetching book details for ID: {book_id}")
        url = f"{settings.GOOGLE_BOOKS_BASE_URL}/volumes/{book_id}"
        print(f"Making request to URL: {url}")  # Add this log
        
        async with httpx.AsyncClient() as client:
            # Add debug headers
            headers = {
                "Accept": "application/json",
                "User-Agent": "Shelfd/1.0"
            }
            response = await client.get(url, headers=headers)
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")  # Add this log
            print(f"Response body: {response.text}")  # Add this log
            
            if response.status_code == 404:
                print(f"Book not found: {book_id}")  # Add this log
                raise HTTPException(
                    status_code=404,
                    detail=f"Book with ID {book_id} not found"
                )
            
            if not response.is_success:
                print(f"API error: {response.text}")  # Add this log
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Google Books API error: {response.text}"
                )
            
            data = response.json()
            volume_info = data.get("volumeInfo", {})
            
            # Transform the response to match your frontend expectations
            book_data = {
                "id": data["id"],
                "title": volume_info.get("title", "Unknown Title"),
                "author": ", ".join(volume_info.get("authors", ["Unknown Author"])),
                "description": volume_info.get("description", "No description available"),
                "rating": volume_info.get("averageRating"),
                "tags": volume_info.get("categories", []),
                "image_url": volume_info.get("imageLinks", {}).get("thumbnail"),
                "publishedDate": volume_info.get("publishedDate"),
                "pageCount": volume_info.get("pageCount"),
                "language": volume_info.get("language"),
                "previewLink": volume_info.get("previewLink")
            }
            
            print(f"Transformed book data: {book_data}")  # Debug log
            return book_data
            
    except httpx.HTTPError as e:
        print(f"HTTP Error occurred: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch book from Google Books API: {str(e)}"
        )
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.get("/tv/{tv_id}")
async def get_tv_details(tv_id: int):
    """Fetch TV show details from TMDB API"""
    try:
        print(f"[TV Details Backend] Fetching TV show details for ID: {tv_id}")
        url = f"{settings.TMDB_BASE_URL}/tv/{tv_id}"
        params = {
            "api_key": settings.TMDB_API_KEY,
            "append_to_response": "credits,videos,similar,recommendations"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"TV show with ID {tv_id} not found"
                )
            
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching TV show details: {str(e)}"
        )

@router.get("/movies/{movie_id}")
async def get_movie_details(movie_id: int):
    """Fetch movie details from TMDB API"""
    try:
        print(f"[Movie Details Backend] Fetching movie details for ID: {movie_id}")
        url = f"{settings.TMDB_BASE_URL}/movie/{movie_id}"
        params = {
            "api_key": settings.TMDB_API_KEY,
            "append_to_response": "credits,videos,similar,recommendations"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"Movie with ID {movie_id} not found"
                )
            
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching movie details: {str(e)}"
        )

@router.get("/shelves/user/{media_type}")
async def get_user_shelves(
    media_type: str,
    current_user: str = Depends(get_current_user)
):
    print(f"Debug - Received media_type: {media_type}")
    print(f"Debug - Current user: {current_user}")
    
    try:
        shelves = await ShelfService.get_user_shelves(
            user_id=current_user,
            media_type=media_type
        )
        print(f"Debug - Found shelves: {shelves}")
        return shelves
    except Exception as e:
        print(f"Debug - Error getting shelves: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))