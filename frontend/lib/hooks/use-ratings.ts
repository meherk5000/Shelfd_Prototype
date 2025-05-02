import { useState, useCallback } from 'react';
// Remove direct axios import
// import axios from 'axios';
import { api } from '@/lib/api'; // Import the configured api instance
import { useAuth } from '@/lib/context/AuthContext'; // Import useAuth
import { API_BASE_URL } from '../config'; // Keep for URL construction
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios'; // Keep for isAxiosError check if needed

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
  const { isAuthenticated } = useAuth(); // Get authentication status

  const getRating = useCallback(async (mediaType: string, mediaId: string): Promise<RatingResponse> => {
    setLoading(true);
    setError(null);

    // Check authentication status using useAuth
    if (!isAuthenticated) {
      return { success: false, error: 'Sign in required to view your rating' };
    }

    try {
      // Remove manual token fetching
      // const token = localStorage.getItem('token');
      // if (!token) { ... } // Replaced by isAuthenticated check above

      const normalizedMediaType = mediaType.toLowerCase().replace('_', '-').replace(' ', '-');

      // Use api instance, remove manual headers
      const response = await api.get(
        `/api/shelves/rating/${normalizedMediaType}/${mediaId}`
        // {
        //   headers: {
        //     Authorization: `Bearer ${token}`
        //   }
        // }
      );

      return { success: true, data: response.data };
    } catch (err: any) {
       // Keep existing error handling
       if (axios.isAxiosError(err) && err.response?.status === 401) {
         setError("Authentication error fetching rating data.");
         return { success: false, error: "Authentication error" };
       }
      const errorMessage = err.response?.data?.detail || 'Failed to fetch rating data';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Add isAuthenticated dependency

  const submitRating = useCallback(async (
    mediaType: string,
    mediaId: string,
    rating: number,
    review?: string,
    mediaTitle?: string,
    imageUrl?: string
  ): Promise<RatingResponse> => {
    setLoading(true);
    setError(null);

    // Check authentication status using useAuth
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to rate media items",
      });
      return { success: false, error: 'Authentication required' };
    }

    try {
      // Remove manual token fetching
      // const token = localStorage.getItem('token');
      // if (!token) { ... } // Replaced by isAuthenticated check above

      // Keep rating validation
      if (rating < 1 || rating > 5) {
        const errorMessage = 'Rating must be between 1 and 5';
        toast({
          variant: "destructive",
          title: "Invalid Rating",
          description: errorMessage,
        });
        return { success: false, error: errorMessage };
      }

      console.log(`[useRatings] Submitting rating - Media Type: ${mediaType}, Media ID: ${mediaId}, Rating: ${rating}`);

      const payload = {
        media_id: mediaId,
        media_type: mediaType,
        rating: rating,
        review: review,
        title: mediaTitle,
        image_url: imageUrl
      };

      console.log('[useRatings] Payload:', payload);

      // Use api instance, remove manual headers
      const response = await api.post(
        `/api/shelves/rate`,
        payload
        // {
        //   headers: {
        //     'Content-Type': 'application/json',
        //     Authorization: `Bearer ${token}`
        //   }
        // }
      );

      toast({
        title: "Rating Saved",
        description: "Your rating and review have been saved successfully",
      });

      return { success: true, data: response.data };
    } catch (err: any) {
      // Keep existing error handling
      if (axios.isAxiosError(err) && err.response?.status === 401) {
         toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please sign in again to submit your rating.",
        });
      }
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
  }, [isAuthenticated, toast]); // Add isAuthenticated dependency

  return {
    getRating,
    submitRating,
    loading,
    error
  };
} 