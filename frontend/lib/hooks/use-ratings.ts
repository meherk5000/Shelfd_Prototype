import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useToast } from '@/components/ui/use-toast';

interface RatingData {
  user_rating: number | null;
  user_review: string | null;
  user_review_date: string | null;
  avg_rating: number | null;
  total_ratings: number;
  in_shelf: boolean;
}

interface RatingResponse {
  success: boolean;
  data?: RatingData;
  error?: string;
}

export function useRatings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getRating = useCallback(async (mediaType: string, mediaId: string): Promise<RatingResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'Authentication required' };
      }
      
      // Normalize media type format to match API
      const normalizedMediaType = mediaType.toLowerCase().replace('_', '-').replace(' ', '-');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/shelves/rating/${normalizedMediaType}/${mediaId}`, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return { success: true, data: response.data };
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch rating data';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const submitRating = useCallback(async (
    mediaType: string, 
    mediaId: string, 
    rating: number, 
    review?: string
  ): Promise<RatingResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to rate media items",
        });
        return { success: false, error: 'Authentication required' };
      }
      
      // Validate rating
      if (rating < 1 || rating > 5) {
        const errorMessage = 'Rating must be between 1 and 5';
        toast({
          variant: "destructive",
          title: "Invalid Rating",
          description: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
      
      // Debug what's being sent
      console.log(`[useRatings] Submitting rating - Media Type: ${mediaType}, Media ID: ${mediaId}, Rating: ${rating}`);
      
      // We're expecting mediaType to already be normalized at this point
      // Just use it as is - the caller (ShelfStatusChangeDialog) has already properly formatted it
      
      const payload = {
        media_id: mediaId,
        media_type: mediaType, // Use the mediaType directly as passed to the function
        rating: rating,
        review: review
      };
      
      console.log('[useRatings] Payload:', payload);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/shelves/rate`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      toast({
        title: "Rating Saved",
        description: "Your rating and review have been saved successfully",
      });
      
      return { success: true, data: response.data };
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to submit rating';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    getRating,
    submitRating,
    loading,
    error
  };
} 