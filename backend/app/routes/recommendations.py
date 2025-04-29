from fastapi import APIRouter, Depends, HTTPException
from ..services.auth import get_current_user
from ..database.models.user import User
from ..services.recommendation_service import RecommendationService

router = APIRouter()

@router.get("/recommendations")
async def get_recommendations(current_user: User = Depends(get_current_user)):
    """Get AI-powered content-based recommendations for the current user"""
    try:
        user_id = str(current_user.id)
        recommendations = await RecommendationService.get_user_recommendations(user_id)
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recommendations: {str(e)}") 