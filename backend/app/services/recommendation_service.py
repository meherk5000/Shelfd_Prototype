"""
Recommendation Service

This module provides functionality for generating and retrieving personalized
media recommendations for users based on their consumption history and preferences.

The recommendation system works in two ways:
1. Fetches pre-computed recommendations from the database (processed in background tasks)
2. Falls back to mock data if no recommendations exist yet for a user

In a production environment, this service would connect to a more sophisticated
recommendation engine that analyzes user behavior, content similarity, and collaborative
filtering to provide personalized suggestions.
"""
from typing import List, Dict, Any
import json
from pathlib import Path
from ..database.models.recommendation import Recommendation

class RecommendationService:
    """
    Service class for handling media recommendations
    
    This class provides methods to retrieve personalized recommendations for users
    based on their past interactions with media content in the application.
    """
    
    @staticmethod
    async def get_user_recommendations(user_id: str) -> List[Dict[str, Any]]:
        """
        Get stored recommendations for a user
        
        This method attempts to retrieve recommendations in the following order:
        1. From the database (pre-computed by background recommendation tasks)
        2. From mock data if no recommendations exist in the database
        
        Parameters:
            user_id (str): The unique identifier of the user
            
        Returns:
            List[Dict[str, Any]]: A list of recommended media items with details:
                - id: Unique identifier for the media
                - title: Title of the media
                - subtitle: Creator (author, director) of the media
                - image_url: URL to the media's poster/cover image
                - mediaType: Type of media (book, movie, tv, article)
                - similarity_score: How closely this matches the user's preferences
        """
        try:
            # First try to get recommendations from database that were
            # pre-computed by background recommendation tasks
            recommendations = await Recommendation.find(
                {"user_id": user_id}
            ).sort(
                [("similarity_score", -1)]  # Sort by highest similarity score first
            ).to_list()
            
            # If there are recommendations in the database, format and return them
            if recommendations:
                return [
                    {
                        "id": rec.media_id,
                        "title": rec.title,
                        "subtitle": rec.creator,
                        "image_url": rec.image_url,
                        "mediaType": rec.media_type,
                        "similarity_score": rec.similarity_score
                    }
                    for rec in recommendations
                ]
            
            # If no recommendations found in database, use mock data for development/demo
            # In production, this would trigger an asynchronous recommendation generation task
            mock_file = Path(__file__).resolve().parent.parent.parent.parent / "scripts" / "data" / "mock_recommendations.json"
            if mock_file.exists():
                with open(mock_file, 'r') as f:
                    mock_data = json.load(f)
                return mock_data.get('recommendations', [])
            
            # If no mock data either, return empty list
            return []
        except Exception as e:
            # Log the error but don't crash the application if recommendations fail
            # Recommendations are non-critical functionality
            print(f"Error getting recommendations: {e}")
            return [] 