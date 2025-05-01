import asyncio
import os
import sys
import pickle
from pathlib import Path
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
from dotenv import load_dotenv
import certifi

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Add project root to path for imports
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# --- Corrected Imports using absolute paths from backend root ---
from app.database.models.user import User
from app.database.models.shelf import ShelfItemModel, ShelfModel, MediaType
from app.database.models.recommendation import Recommendation
from app.services.external_api import get_book_details, get_movie_details, get_tv_details
from config import Settings
# --- End Corrected Imports ---

# Create data directory for model storage
DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Model file paths
BOOK_VECTORS_FILE = DATA_DIR / "book_vectors.pkl"
MOVIE_VECTORS_FILE = DATA_DIR / "movie_vectors.pkl"
TV_VECTORS_FILE = DATA_DIR / "tv_vectors.pkl"
BOOK_MAPPING_FILE = DATA_DIR / "book_mapping.pkl"
MOVIE_MAPPING_FILE = DATA_DIR / "movie_mapping.pkl"
TV_MAPPING_FILE = DATA_DIR / "tv_mapping.pkl"
BOOK_DETAILS_FILE = DATA_DIR / "book_details.pkl"
MOVIE_DETAILS_FILE = DATA_DIR / "movie_details.pkl"
TV_DETAILS_FILE = DATA_DIR / "tv_details.pkl"


async def fetch_unique_media_items():
    """Fetch all unique media items from the database"""
    # Use aggregation to get unique media_id and media_type combinations
    pipeline = [
        {"$group": {"_id": {"media_id": "$media_id", "media_type": "$media_type"}}},
        {"$project": {"media_id": "$_id.media_id", "media_type": "$_id.media_type", "_id": 0}}
    ]
    
    items_cursor = await ShelfItemModel.aggregate(pipeline).to_list()
    
    # Separate by media type
    books = [item for item in items_cursor if item["media_type"] == MediaType.BOOK]
    movies = [item for item in items_cursor if item["media_type"] == MediaType.MOVIE]
    tv_shows = [item for item in items_cursor if item["media_type"] == MediaType.TV]
    
    print(f"Found {len(books)} unique books, {len(movies)} movies, and {len(tv_shows)} TV shows")
    return books, movies, tv_shows


async def get_book_features(books):
    """Extract features from books using Google Books API with caching"""
    book_features = []
    book_details_structured = {} # To store structured details {media_id: {title, subtitle, image_url}}
    id_to_index = {}
    
    # Try to load existing RAW book details cache
    raw_details_cache = {}
    if os.path.exists(BOOK_DETAILS_FILE):
        try:
            with open(BOOK_DETAILS_FILE, 'rb') as f:
                raw_details_cache = pickle.load(f)
                print(f"Loaded {len(raw_details_cache)} existing raw book API responses")
        except Exception:
            pass # Ignore errors loading cache
    
    details_changed = False # Flag to track if we need to save the raw cache

    for i, book in enumerate(books):
        media_id = book["media_id"]
        
        try:
            # Check cache for RAW API response
            if media_id in raw_details_cache:
                details = raw_details_cache[media_id]
                # print(f"Using cached raw details for book {media_id}") # Less verbose
            else:
                # print(f"Fetching details for book {media_id}") # Less verbose
                details = await get_book_details(media_id)
                # Add raw response to our cache if valid
                if details and "volumeInfo" in details:
                    raw_details_cache[media_id] = details
                    details_changed = True
            
            if not details or "volumeInfo" not in details:
                print(f"No valid details for book {media_id}")
                continue
                
            info = details["volumeInfo"]
            
            # --- Store STRUCTURED details --- 
            book_details_structured[media_id] = {
                "title": info.get("title", ""),
                "subtitle": ", ".join(info.get("authors", [])), # Store authors as subtitle string
                "image_url": info.get("imageLinks", {}).get("thumbnail", "")
            }
            # --- End Store STRUCTURED details --- 
            
            # Extract text features
            title = info.get("title", "")
            authors = " ".join(info.get("authors", []))
            categories = " ".join(info.get("categories", []))
            description = info.get("description", "")
            
            # Combine into feature text
            feature_text = f"{title} {authors} {categories} {description}".lower()
            
            book_features.append(feature_text)
            id_to_index[media_id] = i
            
        except Exception as e:
            print(f"Error processing book {media_id}: {str(e)}")
    
    # Save the RAW API response cache if it changed
    if details_changed:
        with open(BOOK_DETAILS_FILE, 'wb') as f:
            pickle.dump(raw_details_cache, f)
    
    # Return the STRUCTURED details for recommendations
    return book_features, id_to_index, book_details_structured


async def get_movie_features(movies):
    """Extract features from movies using TMDB API with caching"""
    movie_features = []
    movie_details_structured = {} # Structured details
    id_to_index = {}
    
    # Load existing RAW movie details cache
    raw_details_cache = {}
    if os.path.exists(MOVIE_DETAILS_FILE):
        try:
            with open(MOVIE_DETAILS_FILE, 'rb') as f:
                raw_details_cache = pickle.load(f)
                print(f"Loaded {len(raw_details_cache)} existing raw movie API responses")
        except Exception:
            pass
    
    details_changed = False

    for i, movie in enumerate(movies):
        media_id = movie["media_id"]
        
        try:
            # Check RAW cache
            if media_id in raw_details_cache:
                details = raw_details_cache[media_id]
                # print(f"Using cached raw details for movie {media_id}")
            else:
                # print(f"Fetching details for movie {media_id}")
                details = await get_movie_details(int(media_id))
                if details:
                    raw_details_cache[media_id] = details
                    details_changed = True
            
            if not details:
                print(f"No valid details for movie {media_id}")
                continue
                
            # Store STRUCTURED details
            movie_details_structured[media_id] = {
                "title": details.get("title", ""),
                "subtitle": details.get("release_date", "")[:4] if details.get("release_date") else "", # Use year as subtitle
                "image_url": details.get("poster_path") and f"https://image.tmdb.org/t/p/w500{details['poster_path']}"
            }
            
            # Extract text features
            title = details.get("title", "")
            genres = " ".join([g["name"] for g in details.get("genres", [])])
            overview = details.get("overview", "")
            director = ""
            if "credits" in details and "crew" in details["credits"]:
                directors = [c["name"] for c in details["credits"]["crew"] if c.get("job") == "Director"]
                director = " ".join(directors)
            feature_text = f"{title} {genres} {director} {overview}".lower()
            
            movie_features.append(feature_text)
            id_to_index[media_id] = i
            
        except Exception as e:
            print(f"Error processing movie {media_id}: {str(e)}")
    
    # Save RAW API response cache if changed
    if details_changed:
        with open(MOVIE_DETAILS_FILE, 'wb') as f:
            pickle.dump(raw_details_cache, f)
    
    # Return STRUCTURED details
    return movie_features, id_to_index, movie_details_structured


async def get_tv_features(tv_shows):
    """Extract features from TV shows using TMDB API with caching"""
    tv_features = []
    tv_details_structured = {} # Structured details
    id_to_index = {}
    
    # Load existing RAW TV details cache
    raw_details_cache = {}
    if os.path.exists(TV_DETAILS_FILE):
        try:
            with open(TV_DETAILS_FILE, 'rb') as f:
                raw_details_cache = pickle.load(f)
                print(f"Loaded {len(raw_details_cache)} existing raw TV show API responses")
        except Exception:
            pass

    details_changed = False

    for i, tv in enumerate(tv_shows):
        media_id = tv["media_id"]
        
        try:
            # Check RAW cache
            if media_id in raw_details_cache:
                details = raw_details_cache[media_id]
                # print(f"Using cached raw details for TV show {media_id}")
            else:
                # print(f"Fetching details for TV show {media_id}")
                details = await get_tv_details(int(media_id))
                if details:
                    raw_details_cache[media_id] = details
                    details_changed = True
            
            if not details:
                print(f"No valid details for TV show {media_id}")
                continue
                
            # Store STRUCTURED details
            tv_details_structured[media_id] = {
                "title": details.get("name", ""), # Use 'name' for TV title
                "subtitle": details.get("first_air_date", "")[:4] if details.get("first_air_date") else "", # Use year as subtitle
                "image_url": details.get("poster_path") and f"https://image.tmdb.org/t/p/w500{details['poster_path']}"
            }
            
            # Extract text features
            title = details.get("name", "")
            genres = " ".join([g["name"] for g in details.get("genres", [])])
            overview = details.get("overview", "")
            creators = " ".join([c["name"] for c in details.get("created_by", [])])
            feature_text = f"{title} {genres} {creators} {overview}".lower()
            
            tv_features.append(feature_text)
            id_to_index[media_id] = i
            
        except Exception as e:
            print(f"Error processing TV show {media_id}: {str(e)}")
    
    # Save RAW API response cache if changed
    if details_changed:
        with open(TV_DETAILS_FILE, 'wb') as f:
            pickle.dump(raw_details_cache, f)
    
    # Return STRUCTURED details
    return tv_features, id_to_index, tv_details_structured


def create_tfidf_model(features):
    """Create TF-IDF vectors from text features"""
    if not features:
        return None, None
        
    vectorizer = TfidfVectorizer(
        stop_words='english',
        max_features=5000,
        ngram_range=(1, 2)
    )
    
    vectors = vectorizer.fit_transform(features)
    return vectorizer, vectors


async def generate_recommendations_for_user(user_id, book_vectors, book_mapping, book_details,
                                           movie_vectors, movie_mapping, movie_details,
                                           tv_vectors, tv_mapping, tv_details):
    """Generate and store recommendations for a single user"""
    # Get user's items
    user_items = await ShelfItemModel.find({"user_id": user_id}).to_list()
    
    if not user_items:
        print(f"User {user_id} has no items on shelves, skipping")
        return 0
    
    print(f"Generating recommendations for user {user_id} with {len(user_items)} shelf items")
    
    # Separate by media type and filter by shelf type (consider only positive interactions)
    user_books = []
    user_movies = []
    user_tv_shows = []
    
    for item in user_items:
        # Find the shelf for this item to check its type
        shelf_id = item.shelf_id
        try:
            shelf = await ShelfModel.get(shelf_id)
            
            # Skip items on "Did Not Finish" shelves
            if shelf and shelf.status == "did_not_finish":
                continue
        except:
            # If shelf can't be found, include the item anyway
            pass
            
        if item.media_type == MediaType.BOOK:
            user_books.append(item)
        elif item.media_type == MediaType.MOVIE:
            user_movies.append(item)
        elif item.media_type == MediaType.TV:
            user_tv_shows.append(item)
    
    # --- Add TV Show Debugging --- 
    if user_id == "67cd988d2cf7abfe3da0ae7d": # Specific check for Jake
        print(f"--- Debug Jake (TV): Found {len(user_tv_shows)} TV shows in profile after shelf filter.")
        if user_tv_shows:
            print(f"--- Debug Jake (TV): Profile TV IDs: {[item.media_id for item in user_tv_shows]}")
    # --- End TV Show Debugging --- 
    
    all_recommendations = []
    
    # Books
    if user_books and book_vectors is not None:
        book_recs = get_similar_items(
            user_books, book_vectors, book_mapping, book_details,
            exclude_ids=[item.media_id for item in user_items],
            media_type="book", limit=10
        )
        all_recommendations.extend(book_recs)
    
    # Movies
    if user_movies and movie_vectors is not None:
        movie_recs = get_similar_items(
            user_movies, movie_vectors, movie_mapping, movie_details,
            exclude_ids=[item.media_id for item in user_items],
            media_type="movie", limit=10
        )
        all_recommendations.extend(movie_recs)
    
    # TV Shows
    tv_recs = [] # Initialize tv_recs
    if user_tv_shows and tv_vectors is not None and tv_mapping:
        print(f"--- Debug Jake (TV): Calling get_similar_items for TV...") # Log before call
        tv_recs = get_similar_items(
            user_tv_shows, tv_vectors, tv_mapping, tv_details,
            exclude_ids=[item.media_id for item in user_items],
            media_type="tv", limit=10 # Make sure limit is reasonable
        )
        # --- Add TV Show Debugging --- 
        if user_id == "67cd988d2cf7abfe3da0ae7d":
            print(f"--- Debug Jake (TV): get_similar_items returned {len(tv_recs)} TV recs.")
            if tv_recs:
                print(f"--- Debug Jake (TV): Returned TV Rec IDs: {[rec['id'] for rec in tv_recs]}")
        # --- End TV Show Debugging ---
        all_recommendations.extend(tv_recs)
    elif user_id == "67cd988d2cf7abfe3da0ae7d": # Log why TV recs might be skipped
         print(f"--- Debug Jake (TV): Skipping TV recommendation generation. Reasons:")
         if not user_tv_shows: print(f"    - No user TV shows found after filtering.")
         if tv_vectors is None: print(f"    - tv_vectors is None.")
         if not tv_mapping: print(f"    - tv_mapping is empty.")
            
    # Store recommendations in database
    # First, remove old recommendations
    await Recommendation.find({"user_id": user_id}).delete()
    
    # Create new recommendation documents
    recommendations_to_insert = []
    for rec in all_recommendations:
        # --- Add TV Show Debugging --- 
        if user_id == "67cd988d2cf7abfe3da0ae7d" and rec["mediaType"] == "tv":
            print(f"--- Debug Jake (TV): Preparing TV recommendation for insertion: ID={rec['id']}, Title={rec['title']}")
        # --- End TV Show Debugging --- 
        recommendations_to_insert.append(
            Recommendation(
                user_id=user_id,
                media_id=rec["id"],
                media_type=rec["mediaType"],
                title=rec["title"],
                creator=rec.get("subtitle", ""),
                image_url=rec.get("image_url", ""),
                similarity_score=rec.get("similarity_score", 0.0)
            )
        )
    
    if recommendations_to_insert:
        await Recommendation.insert_many(recommendations_to_insert)
        # --- Add TV Show Debugging --- 
        jake_tv_inserted_count = sum(1 for r in recommendations_to_insert if r.user_id == "67cd988d2cf7abfe3da0ae7d" and r.media_type == MediaType.TV)
        if user_id == "67cd988d2cf7abfe3da0ae7d" and jake_tv_inserted_count > 0:
             print(f"--- Debug Jake (TV): Attempted to insert {jake_tv_inserted_count} TV recommendations.")
        elif user_id == "67cd988d2cf7abfe3da0ae7d":
             print(f"--- Debug Jake (TV): No TV recommendations were prepared for insertion.")
        # --- End TV Show Debugging ---
        # print(f"Stored {len(recommendations_to_insert)} recommendations for user {user_id}") # Make original log less verbose for clarity

    return len(recommendations_to_insert)


def get_similar_items(user_items, vectors, id_to_index, item_details, exclude_ids, media_type, limit=10):
    """Find similar items based on vector similarity"""
    
    # --- Add Debugging --- 
    is_jake_tv = (media_type == "tv" and any(item.user_id == "67cd988d2cf7abfe3da0ae7d" for item in user_items))
    if is_jake_tv:
        print(f"--- Debug Jake (get_similar): Processing {len(user_items)} TV items for Jake.")
        print(f"--- Debug Jake (get_similar): id_to_index size: {len(id_to_index)}")
        print(f"--- Debug Jake (get_similar): exclude_ids size: {len(exclude_ids)}")
        user_tv_ids = [item.media_id for item in user_items]
        print(f"--- Debug Jake (get_similar): Jake's input TV IDs: {user_tv_ids}")
    # --- End Debugging --- 
    
    # Get indices of user's items
    user_indices = []
    found_indices_count = 0 # Debug counter
    for item in user_items:
        if item.media_id in id_to_index:
            user_indices.append(id_to_index[item.media_id])
            found_indices_count += 1
        elif is_jake_tv: # Log only if it's Jake's TV and ID is missing
            print(f"--- Debug Jake (get_similar): WARNING - TV ID {item.media_id} not found in id_to_index/mapping!")
    
    # --- Add Debugging --- 
    if is_jake_tv:
        print(f"--- Debug Jake (get_similar): Found {found_indices_count} indices for Jake's TV shows.")
        print(f"--- Debug Jake (get_similar): User Indices: {user_indices}")
    # --- End Debugging --- 

    if not user_indices:
        if is_jake_tv: print(f"--- Debug Jake (get_similar): Returning empty list because user_indices is empty.")
        return []
    
    # Get user item vectors
    user_vectors = vectors[user_indices]
    
    # Calculate similarity
    similarities = cosine_similarity(user_vectors, vectors)
    
    # Average similarities across user's items
    avg_similarities = np.mean(similarities, axis=0)
    
    # --- Add Debugging --- 
    if is_jake_tv:
        print(f"--- Debug Jake (get_similar): Calculated avg_similarities. Shape: {avg_similarities.shape}")
    # --- End Debugging --- 

    # Get top similar items
    similar_items = []
    potential_recs_checked = 0 # Debug counter
    recs_excluded_count = 0 # Debug counter
    
    sorted_indices = np.argsort(-avg_similarities)
    if is_jake_tv: print(f"--- Debug Jake (get_similar): Top 5 sorted indices by similarity: {sorted_indices[:5]}")
    
    for i in sorted_indices:
        potential_recs_checked += 1
        media_id = None
        for mid, idx in id_to_index.items():
            if idx == i:
                media_id = mid
                break
        
        if media_id and media_id not in exclude_ids:
            # --- Use Structured Details --- 
            details = item_details.get(media_id, {}) # Get the structured details
            title = details.get("title") or f"Item {media_id}" # Fallback if title is still missing
            subtitle = details.get("subtitle", "")
            image_url = details.get("image_url", "")
            # --- End Use Structured Details ---
            
            # Append using the extracted details
            similar_items.append({
                "id": media_id,
                "title": title,
                "subtitle": subtitle,
                "image_url": image_url,
                "mediaType": media_type,
                "similarity_score": float(avg_similarities[i])
            })
            
            if len(similar_items) >= limit:
                if is_jake_tv: print(f"--- Debug Jake (get_similar): Reached limit ({limit}).")
                break # Exit outer loop
        elif media_id in exclude_ids:
             recs_excluded_count += 1
             # Optional verbose logging for excluded items
             # if is_jake_tv: print(f"--- Debug Jake (get_similar): Excluding item {media_id} because it's already in exclude_ids.")
        
        # Safety break if we check too many (shouldn't happen with argsort)
        # if potential_recs_checked > len(id_to_index) + 5: break
            
    # --- Add Debugging --- 
    if is_jake_tv:
        print(f"--- Debug Jake (get_similar): Checked {potential_recs_checked} potential recs.")
        print(f"--- Debug Jake (get_similar): Excluded {recs_excluded_count} items already owned.")
        print(f"--- Debug Jake (get_similar): Returning {len(similar_items)} TV recommendations.")
    # --- End Debugging --- 

    return similar_items


async def update_all_recommendations(book_vectors, book_mapping, book_details,
                                   movie_vectors, movie_mapping, movie_details,
                                   tv_vectors, tv_mapping, tv_details):
    """Update recommendations for all users using pre-computed data."""
    print("Starting recommendation update process using provided data")
    
    try:
        # Data is now passed directly, no need to load from files here
        
        # Get all users
        users = await User.find_all().to_list()
        print(f"Found {len(users)} users")
        
        total_recommendations = 0
        
        # Generate recommendations for each user
        for user in users:
            try:
                count = await generate_recommendations_for_user(
                    str(user.id), 
                    book_vectors, book_mapping, book_details,
                    movie_vectors, movie_mapping, movie_details,
                    tv_vectors, tv_mapping, tv_details
                )
                total_recommendations += count
            except Exception as e:
                print(f"Error generating recommendations for user {user.id}: {str(e)}")
        
        print(f"Generated a total of {total_recommendations} recommendations")
        
        # Fallback to mock data if needed (logic remains the same)
        if total_recommendations == 0:
            print("No recommendations generated. Generating mock data as fallback.")
            # ... (mock data generation) ...
        
        return total_recommendations
    except Exception as e:
        print(f"Error in update_all_recommendations: {e}")
        # ... (mock data generation fallback) ...
        return 0


async def main():
    """Build recommendation models and generate user recommendations"""
    # Re-add Settings instantiation for DB connection
    settings = Settings()
    
    # Connect to the database
    client = AsyncIOMotorClient(
        settings.mongodb_url,
        tlsCAFile=certifi.where()
    )
    await init_beanie(
        database=client[settings.MONGODB_NAME],
        document_models=[User, ShelfItemModel, ShelfModel, Recommendation]
    )
    print("Connected to database")
    
    # Step 1: Fetch all unique media items
    books, movies, tv_shows = await fetch_unique_media_items()
    
    # Step 2: Process each media type to extract features and STRUCTURED details
    print("Processing books...")
    book_features, book_mapping, book_details = await get_book_features(books)
    
    print("Processing movies...")
    movie_features, movie_mapping, movie_details = await get_movie_features(movies)
    
    print("Processing TV shows...")
    tv_features, tv_mapping, tv_details = await get_tv_features(tv_shows)
    
    # Step 3: Create TF-IDF vectors for each media type
    print("Creating TF-IDF vectors...")
    
    book_vectors, movie_vectors, tv_vectors = None, None, None # Initialize
    
    if book_features:
        _, book_vectors = create_tfidf_model(book_features)
        print(f"Created book vectors with shape {book_vectors.shape}")
        with open(BOOK_VECTORS_FILE, 'wb') as f: pickle.dump(book_vectors, f)
        with open(BOOK_MAPPING_FILE, 'wb') as f: pickle.dump(book_mapping, f)
        print("Saved book vectors and mapping")
    else: 
        print("No book features to vectorize.")
        # Ensure mapping file is empty if no vectors
        with open(BOOK_MAPPING_FILE, 'wb') as f: pickle.dump({}, f)

    
    if movie_features:
        _, movie_vectors = create_tfidf_model(movie_features)
        print(f"Created movie vectors with shape {movie_vectors.shape}")
        with open(MOVIE_VECTORS_FILE, 'wb') as f: pickle.dump(movie_vectors, f)
        with open(MOVIE_MAPPING_FILE, 'wb') as f: pickle.dump(movie_mapping, f)
        print("Saved movie vectors and mapping")
    else: 
        print("No movie features to vectorize.")
        with open(MOVIE_MAPPING_FILE, 'wb') as f: pickle.dump({}, f)

    if tv_features:
        _, tv_vectors = create_tfidf_model(tv_features)
        print(f"Created TV vectors with shape {tv_vectors.shape}")
        with open(TV_VECTORS_FILE, 'wb') as f: pickle.dump(tv_vectors, f)
        with open(TV_MAPPING_FILE, 'wb') as f: pickle.dump(tv_mapping, f)
        print("Saved TV vectors and mapping")
    else: 
        print("No TV features to vectorize.")
        with open(TV_MAPPING_FILE, 'wb') as f: pickle.dump({}, f)

    
    # Step 4: Generate and store recommendations for all users using the data we just computed
    print("Generating recommendations for all users...")
    await update_all_recommendations(book_vectors, book_mapping, book_details, 
                                     movie_vectors, movie_mapping, movie_details,
                                     tv_vectors, tv_mapping, tv_details)
    
    print("Recommendation model build completed")


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main()) 