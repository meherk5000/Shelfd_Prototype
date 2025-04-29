from typing import List, Dict, Any
import json
from pathlib import Path
from ..database.models.recommendation import Recommendation

class RecommendationService:
    @staticmethod
    async def get_user_recommendations(user_id: str) -> List[Dict[str, Any]]:
        """Get stored recommendations for a user"""
        try:
            # First try to get recommendations from database
            recommendations = await Recommendation.find(
                {"user_id": user_id}
            ).sort(
                [("similarity_score", -1)]  # Sort by highest similarity
            ).to_list()
            
            # If there are recommendations in the database, return them
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
            
            # If no recommendations found in database, use mock data
            mock_file = Path(__file__).resolve().parent.parent.parent.parent / "scripts" / "data" / "mock_recommendations.json"
            if mock_file.exists():
                with open(mock_file, 'r') as f:
                    mock_data = json.load(f)
                return mock_data.get('recommendations', [])
            
            # If no mock data either, return empty list
            return []
        except Exception as e:
            print(f"Error getting recommendations: {e}")
            return [] 