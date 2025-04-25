import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useToast } from '@/components/ui/use-toast';

export interface ReviewData {
  id: string;
  user_id: string;
  username: string;
  user_avatar?: string;
  media_id: string;
  media_type: string;
  rating: number;
  review_text?: string;
  contains_spoilers: boolean;
  created_at: string;
  updated_at?: string;
  likes_count: number;
  has_liked: boolean;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

export interface MediaReviewsData {
  reviews: ReviewData[];
  stats: ReviewStats;
}

export interface ReviewResponse {
  success: boolean;
  data?: MediaReviewsData;
  error?: string;
}

export interface UserReviewResponse {
  exists: boolean;
  review?: {
    id: string;
    rating: number;
    review_text?: string;
    contains_spoilers: boolean;
    created_at: string;
    updated_at?: string;
  };
  message?: string;
}

export function useReviews() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getMediaReviews = useCallback(async (
    mediaType: string,
    mediaId: string,
    sortBy: string = 'newest',
    limit: number = 20,
    skip: number = 0
  ): Promise<ReviewResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      // Normalize media type for API (e.g., MOVIE -> movie)
      const normalizedMediaType = mediaType.toLowerCase();
      
      // API call with optional auth
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(
        `${API_BASE_URL}/api/reviews/${normalizedMediaType}/${mediaId}`,
        { 
          headers,
          params: { sort_by: sortBy, limit, skip }
        }
      );
      
      return { success: true, data: response.data };
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch reviews';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserReview = useCallback(async (
    mediaType: string,
    mediaId: string
  ): Promise<UserReviewResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { exists: false, message: 'Authentication required' };
      }
      
      // Normalize media type for API
      const normalizedMediaType = mediaType.toLowerCase().replace('_', '-').replace(' ', '-');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/reviews/user/${normalizedMediaType}/${mediaId}`,
        { 
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch your review';
      setError(errorMessage);
      return { exists: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const submitReview = useCallback(async (
    mediaType: string,
    mediaId: string,
    rating: number,
    reviewText?: string,
    containsSpoilers: boolean = false
  ): Promise<{ success: boolean; message: string; reviewId?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to review media items",
        });
        return { success: false, message: 'Authentication required' };
      }
      
      // Validate rating
      const validRatings = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
      if (!validRatings.includes(rating)) {
        const errorMessage = 'Rating must be between 1 and 5 with half-star increments';
        toast({
          variant: "destructive",
          title: "Invalid Rating",
          description: errorMessage,
        });
        return { success: false, message: errorMessage };
      }
      
      // Keep media type as is - the backend expects it in uppercase
      const payload = {
        media_id: mediaId,
        media_type: mediaType,
        rating,
        review_text: reviewText,
        contains_spoilers: containsSpoilers
      };
      
      // Log the payload before sending
      console.log("Submitting review payload:", payload);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/reviews`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      toast({
        title: "Review Saved",
        description: "Your review has been saved successfully",
      });
      
      return { 
        success: true, 
        message: 'Review submitted successfully',
        reviewId: response.data.review_id
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to submit review';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateReview = useCallback(async (
    reviewId: string,
    updates: {
      rating?: number;
      reviewText?: string;
      containsSpoilers?: boolean;
    }
  ): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, message: 'Authentication required' };
      }
      
      // Validate rating if provided
      if (updates.rating !== undefined) {
        const validRatings = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
        if (!validRatings.includes(updates.rating)) {
          const errorMessage = 'Rating must be between 1 and 5 with half-star increments';
          return { success: false, message: errorMessage };
        }
      }
      
      // Transform to API format
      const payload = {
        rating: updates.rating,
        review_text: updates.reviewText,
        contains_spoilers: updates.containsSpoilers
      };
      
      await axios.put(
        `${API_BASE_URL}/api/reviews/${reviewId}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      toast({
        title: "Review Updated",
        description: "Your review has been updated successfully",
      });
      
      return { success: true, message: 'Review updated successfully' };
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update review';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteReview = useCallback(async (
    reviewId: string
  ): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, message: 'Authentication required' };
      }
      
      await axios.delete(
        `${API_BASE_URL}/api/reviews/${reviewId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast({
        title: "Review Deleted",
        description: "Your review has been deleted",
      });
      
      return { success: true, message: 'Review deleted successfully' };
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete review';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const likeReview = useCallback(async (
    reviewId: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to like reviews",
        });
        return { success: false, message: 'Authentication required' };
      }
      
      console.log('Attempting to like review:', reviewId);
      const response = await axios.post(
        `${API_BASE_URL}/api/reviews/${reviewId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Like response:', response.data);
      return { success: true, message: response.data.message };
    } catch (err: any) {
      console.error('Error liking review:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to like review';
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      
      return { success: false, message: errorMessage };
    }
  }, [toast]);

  return {
    getMediaReviews,
    getUserReview,
    submitReview,
    updateReview,
    deleteReview,
    likeReview,
    loading,
    error
  };
} 