# backend/scripts/generate_mock_recommendations.py
# This script generates mock recommendations for the user.
# It is used to test the recommendation system.
# It is also used to generate mock data for the database.
# NOTE: This mock data was generated using ChatGPT..

import os
import pickle
import json
import random
from pathlib import Path
import asyncio

# Create data directory
DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Mock data - Movie recommendations
MOCK_MOVIES = [
    {"id": "550", "title": "Fight Club", "subtitle": "1999", "image_url": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "mediaType": "movie", "similarity_score": 0.95},
    {"id": "155", "title": "The Dark Knight", "subtitle": "2008", "image_url": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "mediaType": "movie", "similarity_score": 0.92},
    {"id": "680", "title": "Pulp Fiction", "subtitle": "1994", "image_url": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", "mediaType": "movie", "similarity_score": 0.89},
    {"id": "13", "title": "Forrest Gump", "subtitle": "1994", "image_url": "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", "mediaType": "movie", "similarity_score": 0.87},
    {"id": "769", "title": "GoodFellas", "subtitle": "1990", "image_url": "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg", "mediaType": "movie", "similarity_score": 0.84},
]

# Mock data - TV recommendations
MOCK_TV = [
    {"id": "1396", "title": "Breaking Bad", "subtitle": "2008", "image_url": "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", "mediaType": "tv", "similarity_score": 0.96},
    {"id": "1399", "title": "Game of Thrones", "subtitle": "2011", "image_url": "https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg", "mediaType": "tv", "similarity_score": 0.93},
    {"id": "66732", "title": "Stranger Things", "subtitle": "2016", "image_url": "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", "mediaType": "tv", "similarity_score": 0.91},
    {"id": "1402", "title": "The Walking Dead", "subtitle": "2010", "image_url": "https://image.tmdb.org/t/p/w500/xf9wuDcqlUPWABZNeDKPbZUjWx0.jpg", "mediaType": "tv", "similarity_score": 0.88},
    {"id": "60625", "title": "Rick and Morty", "subtitle": "2013", "image_url": "https://image.tmdb.org/t/p/w500/8kOWDBK6XlPUzckuHDo3wwVRFwt.jpg", "mediaType": "tv", "similarity_score": 0.85},
]

# Mock data - Book recommendations
MOCK_BOOKS = [
    {"id": "zyTCAlFPjgYC", "title": "The Hitchhiker's Guide to the Galaxy", "subtitle": "Douglas Adams", "image_url": "https://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api", "mediaType": "book", "similarity_score": 0.97},
    {"id": "5NomkK4EV68C", "title": "Pride and Prejudice", "subtitle": "Jane Austen", "image_url": "https://books.google.com/books/content?id=5NomkK4EV68C&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api", "mediaType": "book", "similarity_score": 0.94},
    {"id": "iXn5U2IzVH0C", "title": "The Lord of the Rings", "subtitle": "J.R.R. Tolkien", "image_url": "https://books.google.com/books/content?id=iXn5U2IzVH0C&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api", "mediaType": "book", "similarity_score": 0.92},
    {"id": "wrOQLV6xB-wC", "title": "Harry Potter and the Sorcerer's Stone", "subtitle": "J.K. Rowling", "image_url": "https://books.google.com/books/content?id=wrOQLV6xB-wC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api", "mediaType": "book", "similarity_score": 0.89},
    {"id": "kotPYEqx7kMC", "title": "To Kill a Mockingbird", "subtitle": "Harper Lee", "image_url": "https://books.google.com/books/content?id=kotPYEqx7kMC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api", "mediaType": "book", "similarity_score": 0.86},
]

# Generate mock recommendations JSON file
def generate_mock_recommendations():
    # Combine all recommendations
    all_recommendations = MOCK_MOVIES + MOCK_TV + MOCK_BOOKS
    
    # Shuffle and take a subset to make it more varied
    random.shuffle(all_recommendations)
    recommendations = all_recommendations[:10]  # Take 10 random recommendations
    
    # Create a recommendations file
    with open(DATA_DIR / "mock_recommendations.json", "w") as f:
        json.dump({"recommendations": recommendations}, f)
    
    print(f"Generated mock recommendations at {DATA_DIR / 'mock_recommendations.json'}")

if __name__ == "__main__":
    # Run the generator
    generate_mock_recommendations()
    print("Mock recommendation data generated successfully!") 