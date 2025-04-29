# app/routes/media.py
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
import httpx
from pydantic import BaseModel
from config import Settings
from app.services.shelf_service import ShelfService
from app.services.auth import get_current_user
from app.services.article_service import ArticleService

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

@router.get("/search/quick")  
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
            
            # Search articles from MongoDB using ArticleService
            articles = await ArticleService.search_articles(query)

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
                    "id": item.get("id", ""),
                    "title": item.get("volumeInfo", {}).get("title", "Unknown Title"),
                    "subtitle": item.get("volumeInfo", {}).get("authors", [""])[0] if item.get("volumeInfo", {}).get("authors") else None,
                    "image_url": item.get("volumeInfo", {}).get("imageLinks", {}).get("thumbnail"),
                    "authors": item.get("volumeInfo", {}).get("authors", []),
                    "published_date": item.get("volumeInfo", {}).get("publishedDate"),
                    "type": "book"
                }
                for item in book_data.get("items", [])[:5]
            ],
            "articles": articles
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
        print(f"Making request to URL: {url}") 
        
        async with httpx.AsyncClient() as client:
           
            headers = {
                "Accept": "application/json",
                "User-Agent": "Shelfd/1.0"
            }
            response = await client.get(url, headers=headers)
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")  
            print(f"Response body: {response.text}") 
            
            if response.status_code == 404:
                print(f"Book not found: {book_id}") 
                raise HTTPException(
                    status_code=404,
                    detail=f"Book with ID {book_id} not found"
                )
            
            if not response.is_success:
                print(f"API error: {response.text}")  
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Google Books API error: {response.text}"
                )
            
            data = response.json()
            volume_info = data.get("volumeInfo", {})
            
       
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
            
            print(f"Transformed book data: {book_data}") 
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

@router.get("/article/{article_id}")
async def get_article_details(article_id: str):
    """Get details for a specific article"""
    try:
        print(f"Backend received article_id: {article_id}")
        
        # If the ID seems to be base64 encoded, try to decode it
        original_id = article_id
        try_decode = False
        
        # Check if this might be a base64 encoded string
        if article_id.startswith('aHR0cH') or len(article_id) % 4 == 0:
            try_decode = True
        
        if try_decode:
            try:
                import base64
                try:
                    # Try standard base64 decoding
                    decoded = base64.b64decode(article_id).decode('utf-8')
                    print(f"Decoded article_id: {decoded}")
                    
                    # Look for an ID pattern in the decoded string
                    if len(decoded) >= 24 and all(c in '0123456789abcdef' for c in decoded):
                        article_id = decoded
                    # If it looks like a URL with an ID at the end
                    elif '/' in decoded:
                        parts = decoded.split('/')
                        potential_id = parts[-1]
                        # If the last part looks like an ID
                        if len(potential_id) >= 24 and all(c in '0123456789abcdef' for c in potential_id):
                            article_id = potential_id
                except Exception:
                    # Try URL-safe base64 decoding
                    padded = article_id + '=' * (4 - len(article_id) % 4)
                    decoded = base64.urlsafe_b64decode(padded).decode('utf-8')
                    print(f"URL-safe decoded article_id: {decoded}")
                    
                    # Extract ID from decoded string if possible
                    if '/' in decoded:
                        parts = decoded.split('/')
                        article_id = parts[-1]
            except Exception as decode_error:
                print(f"Failed to decode article_id: {decode_error}")
                article_id = original_id  # Restore original ID if decoding fails
        
        print(f"Final article_id to use: {article_id}")
        article = await ArticleService.get_article(article_id)
        
        if not article:
            # Try with the original ID
            if article_id != original_id:
                print(f"Article not found with decoded ID, trying original: {original_id}")
                article = await ArticleService.get_article(original_id)
            
            if not article:
                print(f"Article not found, returning fallback")
                # If article not found, return our fallback article
                return {
                    "id": article_id,
                    "title": "Is there ever such thing as a 'preventative facelift'?",
                    "author": "Laura Pitcher",
                    "source": "Sample Source",
                    "image_url": "https://i.imgur.com/7YfWWmb.jpg",
                    "publication_date": "2025-01-24T00:00:00Z",
                    "content": "People in their 20s and 30s are getting their faces 'lifted into oblivion' in the latest iteration of the 'preventative' ageing trap.",
                    "description": "People in their 20s and 30s are getting their faces 'lifted into oblivion' in the latest iteration of the 'preventative' ageing trap.",
                    "url": "#",
                    "type": "article"
                }
        
        return article
            
    except Exception as e:
        print(f"Article lookup error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Article lookup failed: {str(e)}"
        )

@router.post("/articles/refresh")
async def refresh_articles():
    """Manually trigger article refresh from RSS feeds"""
    try:
        result = await ArticleService.fetch_and_store_articles()
        return {
            "status": "success",
            "message": f"Fetched {result['total']} articles, {result['new']} new"
        }
    except Exception as e:
        print(f"Article refresh error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh articles: {str(e)}"
        )

@router.get("/articles")
async def get_articles(limit: int = 10, skip: int = 0):
    """Get a list of articles with pagination"""
    try:
        client = ArticleService.get_mongo_client()
        db = client[settings.MONGODB_NAME]
        collection = db["articles"]
        
        # Get total count for pagination
        total_count = collection.count_documents({})
        
        # Get articles with pagination, sorted by published date
        articles = list(collection.find().sort("published_date", -1).skip(skip).limit(limit))
        
        # Format articles for response
        formatted_articles = []
        for article in articles:
            formatted_articles.append({
                "id": article["_id"],
                "title": article["title"],
                "author": article.get("author", "Unknown Author"),
                "source": article["source_name"],
                "image_url": article.get("image_url"),
                "publication_date": article.get("published_date", ""),
                "summary": article.get("summary", ""),
                "tags": article.get("tags", []),
                "type": "article"
            })
        
        return {
            "articles": formatted_articles,
            "total": total_count,
            "limit": limit,
            "skip": skip
        }
    except Exception as e:
        print(f"Error getting articles: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get articles: {str(e)}"
        )

@router.get("/explore/trending")
async def get_trending_media(tab: str = "All"):
    """Get trending media across all types or filtered by tab"""
    try:
        # Convert tab to lowercase for case-insensitive comparison
        tab_lower = tab.lower()
        
        async with httpx.AsyncClient() as client:
            # Get popular movies
            movies_data = []
            if tab_lower == "all" or tab_lower == "movies":
                movie_response = await client.get(
                    f"{settings.TMDB_BASE_URL}/movie/popular",
                    params={
                        "api_key": settings.TMDB_API_KEY,
                        "language": "en-US",
                        "page": 1
                    }
                )
                movies = movie_response.json().get("results", [])[:8]
                movies_data = [
                    {
                        "id": str(movie["id"]),
                        "title": movie["title"],
                        "subtitle": movie.get("release_date", "")[:4] if movie.get("release_date") else None,
                        "image_url": f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get("poster_path") else None,
                        "mediaType": "movie",
                        "overview": movie.get("overview", "")
                    }
                    for movie in movies
                ]
            
            # Get popular TV shows
            tv_data = []
            if tab_lower == "all" or tab_lower == "tv-shows":
                tv_response = await client.get(
                    f"{settings.TMDB_BASE_URL}/tv/popular",
                    params={
                        "api_key": settings.TMDB_API_KEY,
                        "language": "en-US",
                        "page": 1
                    }
                )
                tv_shows = tv_response.json().get("results", [])[:8]
                tv_data = [
                    {
                        "id": str(tv["id"]),
                        "title": tv["name"],
                        "subtitle": tv.get("first_air_date", "")[:4] if tv.get("first_air_date") else None,
                        "image_url": f"https://image.tmdb.org/t/p/w500{tv['poster_path']}" if tv.get("poster_path") else None,
                        "mediaType": "tv",
                        "overview": tv.get("overview", "")
                    }
                    for tv in tv_shows
                ]
            
            # Get popular books (using search as a proxy)
            books_data = []
            if tab_lower == "all" or tab_lower == "books":
                books_response = await client.get(
                    f"{settings.GOOGLE_BOOKS_BASE_URL}/volumes",
                    params={
                        "q": "subject:fiction",
                        "orderBy": "relevance",
                        "maxResults": 8
                    }
                )
                books = books_response.json().get("items", [])
                books_data = [
                    {
                        "id": book["id"],
                        "title": book.get("volumeInfo", {}).get("title", "Unknown"),
                        "subtitle": book.get("volumeInfo", {}).get("authors", ["Unknown Author"])[0],
                        "image_url": book.get("volumeInfo", {}).get("imageLinks", {}).get("thumbnail"),
                        "mediaType": "book",
                        "overview": book.get("volumeInfo", {}).get("description", "")
                    }
                    for book in books
                ]
            
            # Get recent articles
            articles_data = []
            if tab_lower == "all" or tab_lower == "articles":
                articles = await ArticleService.get_recent_articles(limit=8)
                articles_data = [
                    {
                        "id": article["id"],
                        "title": article["title"],
                        "subtitle": article.get("author", "Unknown Author"),
                        "image_url": article.get("image_url"),
                        "mediaType": "article",
                        "overview": article.get("description", ""),
                        "read_time": article.get("read_time", "5 min read")
                    }
                    for article in articles
                ]
            
            # Combine results based on tab
            if tab_lower == "all":
                results = movies_data + tv_data + books_data + articles_data
                # Shuffle or sort results as needed
                return {"results": results}
            elif tab_lower == "movies":
                return {"results": movies_data}
            elif tab_lower == "tv-shows":
                return {"results": tv_data}
            elif tab_lower == "books":
                return {"results": books_data}
            elif tab_lower == "articles":
                return {"results": articles_data}
            else:
                return {"results": []}

    except Exception as e:
        print(f"Error getting trending media: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/explore/new-releases")
async def get_new_releases(tab: str = "All"):
    """Get new releases across all types or filtered by tab"""
    try:
        # Convert tab to lowercase for case-insensitive comparison
        tab_lower = tab.lower()

        async with httpx.AsyncClient() as client:
            # Get new release movies
            movies_data = []
            if tab_lower == "all" or tab_lower == "movies":
                movie_response = await client.get(
                    f"{settings.TMDB_BASE_URL}/movie/now_playing",
                    params={
                        "api_key": settings.TMDB_API_KEY,
                        "language": "en-US",
                        "page": 1
                    }
                )
                movies = movie_response.json().get("results", [])[:8]
                movies_data = [
                    {
                        "id": str(movie["id"]),
                        "title": movie["title"],
                        "subtitle": movie.get("release_date", "")[:4] if movie.get("release_date") else None,
                        "image_url": f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get("poster_path") else None,
                        "mediaType": "movie",
                        "overview": movie.get("overview", "")
                    }
                    for movie in movies
                ]
            
            # Get new TV shows
            tv_data = []
            if tab_lower == "all" or tab_lower == "tv-shows":
                tv_response = await client.get(
                    f"{settings.TMDB_BASE_URL}/tv/on_the_air",
                    params={
                        "api_key": settings.TMDB_API_KEY,
                        "language": "en-US",
                        "page": 1
                    }
                )
                tv_shows = tv_response.json().get("results", [])[:8]
                tv_data = [
                    {
                        "id": str(tv["id"]),
                        "title": tv["name"],
                        "subtitle": tv.get("first_air_date", "")[:4] if tv.get("first_air_date") else None,
                        "image_url": f"https://image.tmdb.org/t/p/w500{tv['poster_path']}" if tv.get("poster_path") else None,
                        "mediaType": "tv",
                        "overview": tv.get("overview", "")
                    }
                    for tv in tv_shows
                ]
            
            # Get new books (using search as a proxy)
            books_data = []
            if tab_lower == "all" or tab_lower == "books":
                books_response = await client.get(
                    f"{settings.GOOGLE_BOOKS_BASE_URL}/volumes",
                    params={
                        "q": "subject:fiction",
                        "orderBy": "newest",
                        "maxResults": 8
                    }
                )
                books = books_response.json().get("items", [])
                books_data = [
                    {
                        "id": book["id"],
                        "title": book.get("volumeInfo", {}).get("title", "Unknown"),
                        "subtitle": book.get("volumeInfo", {}).get("authors", ["Unknown Author"])[0],
                        "image_url": book.get("volumeInfo", {}).get("imageLinks", {}).get("thumbnail"),
                        "mediaType": "book",
                        "overview": book.get("volumeInfo", {}).get("description", "")
                    }
                    for book in books
                ]
            
            # Get most recent articles
            articles_data = []
            if tab_lower == "all" or tab_lower == "articles":
                articles = await ArticleService.get_recent_articles(limit=8)
                articles_data = [
                    {
                        "id": article["id"],
                        "title": article["title"],
                        "subtitle": article.get("author", "Unknown Author"),
                        "image_url": article.get("image_url"),
                        "mediaType": "article",
                        "overview": article.get("description", ""),
                        "read_time": article.get("read_time", "5 min read")
                    }
                    for article in articles
                ]
            
            # Combine results based on tab
            if tab_lower == "all":
                results = movies_data + tv_data + books_data + articles_data
                # Sort by date (most recent first)
                return {"results": results}
            elif tab_lower == "movies":
                return {"results": movies_data}
            elif tab_lower == "tv-shows":
                return {"results": tv_data}
            elif tab_lower == "books":
                return {"results": books_data}
            elif tab_lower == "articles":
                return {"results": articles_data}
            else:
                return {"results": []}

    except Exception as e:
        print(f"Error getting new releases: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/explore/category/{category}")
async def get_by_category(category: str, tab: str = "All"):
    """Get media by category"""
    try:
        # Convert tab to lowercase for case-insensitive comparison
        tab_lower = tab.lower()
        
        # Map friendly category names to API search terms
        category_map = {
            "fantasy-sci-fi": "fantasy",
            "culture-ideas": "culture",
            "drama-romance": "drama",
        }
        search_term = category_map.get(category, category)
        
        async with httpx.AsyncClient() as client:
            # Get category-specific movies
            movies_data = []
            if tab_lower == "all" or tab_lower == "movies":
                movie_response = await client.get(
                    f"{settings.TMDB_BASE_URL}/search/movie",
                    params={
                        "api_key": settings.TMDB_API_KEY,
                        "language": "en-US",
                        "query": search_term,
                        "page": 1
                    }
                )
                movies = movie_response.json().get("results", [])[:8]
                movies_data = [
                    {
                        "id": str(movie["id"]),
                        "title": movie["title"],
                        "subtitle": movie.get("release_date", "")[:4] if movie.get("release_date") else None,
                        "image_url": f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get("poster_path") else None,
                        "mediaType": "movie",
                        "overview": movie.get("overview", "")
                    }
                    for movie in movies
                ]
            
            # Get category-specific TV shows
            tv_data = []
            if tab_lower == "all" or tab_lower == "tv-shows":
                tv_response = await client.get(
                    f"{settings.TMDB_BASE_URL}/search/tv",
                    params={
                        "api_key": settings.TMDB_API_KEY,
                        "language": "en-US",
                        "query": search_term,
                        "page": 1
                    }
                )
                tv_shows = tv_response.json().get("results", [])[:8]
                tv_data = [
                    {
                        "id": str(tv["id"]),
                        "title": tv["name"],
                        "subtitle": tv.get("first_air_date", "")[:4] if tv.get("first_air_date") else None,
                        "image_url": f"https://image.tmdb.org/t/p/w500{tv['poster_path']}" if tv.get("poster_path") else None,
                        "mediaType": "tv",
                        "overview": tv.get("overview", "")
                    }
                    for tv in tv_shows
                ]
            
            # Get category-specific books
            books_data = []
            if tab_lower == "all" or tab_lower == "books":
                books_response = await client.get(
                    f"{settings.GOOGLE_BOOKS_BASE_URL}/volumes",
                    params={
                        "q": f"subject:{search_term}",
                        "maxResults": 8
                    }
                )
                books = books_response.json().get("items", [])
                books_data = [
                    {
                        "id": book["id"],
                        "title": book.get("volumeInfo", {}).get("title", "Unknown"),
                        "subtitle": book.get("volumeInfo", {}).get("authors", ["Unknown Author"])[0],
                        "image_url": book.get("volumeInfo", {}).get("imageLinks", {}).get("thumbnail"),
                        "mediaType": "book",
                        "overview": book.get("volumeInfo", {}).get("description", "")
                    }
                    for book in books
                ]
            
            # Get category-specific articles
            articles_data = []
            if tab_lower == "all" or tab_lower == "articles":
                articles = await ArticleService.search_articles(search_term, limit=8)
                articles_data = [
                    {
                        "id": article["id"],
                        "title": article["title"],
                        "subtitle": article.get("subtitle", "Unknown Source"),
                        "image_url": article.get("image_url"),
                        "mediaType": "article",
                        "overview": article.get("description", ""),
                        "read_time": article.get("read_time", "5 min read")
                    }
                    for article in articles
                ]
            
            # Combine results based on tab
            if tab_lower == "all":
                results = movies_data + tv_data + books_data + articles_data
                return {"results": results}
            elif tab_lower == "movies":
                return {"results": movies_data}
            elif tab_lower == "tv-shows":
                return {"results": tv_data}
            elif tab_lower == "books":
                return {"results": books_data}
            elif tab_lower == "articles":
                return {"results": articles_data}
            else:
                return {"results": []}

    except Exception as e:
        print(f"Error getting media by category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))