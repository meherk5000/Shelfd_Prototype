import { useState, useCallback } from 'react';
// Remove direct axios import
// import axios from 'axios';
import { api } from '@/lib/api'; // Import the configured api instance
import { useAuth } from '@/lib/context/AuthContext'; // Import useAuth
import { API_BASE_URL } from '../config'; // Keep for URL construction (though api instance uses it)
import { toast } from 'sonner';
import { ShelfStatus } from './use-shelf';
import axios from 'axios'; // Keep for isAxiosError check if needed

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
  has_liked: boolean; // This relies on the user being authenticated
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
  review?: ReviewData;
  message?: string;
  shelf_status?: ShelfStatus | null;
  in_shelf?: boolean;
}

export function useReviews() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth(); // Get authentication status

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
      const normalizedMediaType = mediaType.toLowerCase();

      // Use api instance. Interceptor adds token if available.
      // Remove manual token check and header setting.
      // const token = localStorage.getItem('token');
      // const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await api.get(
        // Use relative path as api instance has baseURL
        `/api/reviews/${normalizedMediaType}/${mediaId}`,
        {
          // headers, // Remove manual headers
          params: { sort_by: sortBy, limit, skip }
        }
      );

      return { success: true, data: response.data };
    } catch (err: any) {
      // Keep existing error handling logic
      const errorMessage = err.response?.data?.detail || 'Failed to fetch reviews';
      setError(errorMessage);
      // Consider differentiating errors for logged-out vs. actual failures if needed
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []); // No dependency on isAuthenticated needed here

  const getUserReview = useCallback(async (
    mediaType: string,
    mediaId: string
  ): Promise<UserReviewResponse> => {
    setLoading(true);
    setError(null);

    // Check authentication status using useAuth
    if (!isAuthenticated) {
      // Return a specific response indicating auth is required
      // Optionally show a toast, but maybe the calling component handles this UI
      return { exists: false, message: 'Sign in required to view your review' };
    }

    try {
      // Remove manual token fetching
      // const token = localStorage.getItem('token');
      // if (!token) { ... } // Replaced by isAuthenticated check above

      const normalizedMediaType = mediaType.toLowerCase().replace('_', '-').replace(' ', '-');

      // Use api instance, remove manual headers
      const response = await api.get(
        `/api/reviews/user/${normalizedMediaType}/${mediaId}`
        // { headers: { Authorization: `Bearer ${token}` } } // Remove manual headers
      );

      return response.data;
    } catch (err: any) {
      // Keep existing error handling, check for 401 specifically if needed
       if (axios.isAxiosError(err) && err.response?.status === 401) {
         // Handle potential (though less likely with interceptor) 401 errors if needed
         setError("Authentication error fetching your review.");
         return { exists: false, message: "Authentication error" };
       }
      const errorMessage = err.response?.data?.detail || 'Failed to fetch your review';
      setError(errorMessage);
      return { exists: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Add isAuthenticated dependency

  const submitReview = useCallback(async (
    mediaType: string,
    mediaId: string,
    rating: number,
    reviewText?: string,
    containsSpoilers: boolean = false,
    title?: string,
    imageUrl?: string,
    creator?: string
  ): Promise<{ success: boolean; message: string; review?: ReviewData }> => {
    setLoading(true);
    setError(null);

    // Check authentication status using useAuth
    if (!isAuthenticated) {
      toast.error('Authentication required', {
        description: "Please sign in to review media items"
      });
      return { success: false, message: 'Authentication required' };
    }

    try {
      // Remove manual token fetching
      // const token = localStorage.getItem('token');
      // if (!token) { ... } // Replaced by isAuthenticated check above

      // Keep rating validation
      const validRatings = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
      if (!validRatings.includes(rating)) {
         const errorMessage = 'Rating must be between 1 and 5 with half-star increments';
         toast.error(errorMessage, { description: "Invalid Rating" });
         return { success: false, message: errorMessage };
      }

      const payload = {
        media_id: mediaId,
        media_type: mediaType,
        rating,
        review_text: reviewText,
        contains_spoilers: containsSpoilers,
        title: title,
        image_url: imageUrl,
        creator: creator
      };

      console.log("Submitting review payload:", payload);

      // Use api instance, remove manual headers
      const response = await api.post(
        `/api/reviews`,
        payload
        // {
        //   headers: {
        //     'Content-Type': 'application/json', // Interceptor might handle this, confirm if needed
        //     Authorization: `Bearer ${token}`
        //   }
        // }
      );

      toast.success("Review Saved", {
        description: "Your review has been saved successfully",
      });

      return {
        success: true,
        message: "Review submitted successfully",
        review: response.data,
      };
    } catch (err: any) {
       // Keep existing error handling
       if (axios.isAxiosError(err) && err.response?.status === 401) {
         toast.error("Authentication error. Please sign in again.");
         // Optionally call logout() from useAuth here if interceptor doesn't handle it
       }
      const errorMessage = err.response?.data?.detail || 'Failed to submit review';
      setError(errorMessage);
      toast.error(errorMessage, { description: "Failed to submit review" });
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Add isAuthenticated dependency

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

    // Check authentication status using useAuth
    if (!isAuthenticated) {
       toast.error('Authentication required', { description: "Please sign in to update reviews" });
      return { success: false, message: 'Authentication required' };
    }

    try {
      // Remove manual token fetching
      // const token = localStorage.getItem('token');
      // if (!token) { ... } // Replaced by isAuthenticated check above

      // Keep rating validation
      if (updates.rating !== undefined) {
        const validRatings = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
        if (!validRatings.includes(updates.rating)) {
          const errorMessage = 'Rating must be between 1 and 5 with half-star increments';
          toast.error(errorMessage, { description: "Invalid Rating" });
          return { success: false, message: errorMessage };
        }
      }

      const payload = {
        rating: updates.rating,
        review_text: updates.reviewText,
        contains_spoilers: updates.containsSpoilers
      };

      // Use api instance, remove manual headers
      await api.put(
        `/api/reviews/${reviewId}`,
        payload
        // {
        //   headers: {
        //     'Content-Type': 'application/json', // Confirm if needed
        //     Authorization: `Bearer ${token}`
        //   }
        // }
      );

      toast.success("Review Updated", {
        description: "Your review has been updated successfully",
      });

      return { success: true, message: 'Review updated successfully' };
    } catch (err: any) {
       // Keep existing error handling
       if (axios.isAxiosError(err) && err.response?.status === 401) {
         toast.error("Authentication error. Please sign in again.");
       }
      const errorMessage = err.response?.data?.detail || 'Failed to update review';
      setError(errorMessage);
      toast.error(errorMessage, { description: "Failed to update review" });
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Add isAuthenticated dependency

  const deleteReview = useCallback(async (
    reviewId: string
  ): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);

     // Check authentication status using useAuth
    if (!isAuthenticated) {
       toast.error('Authentication required', { description: "Please sign in to delete reviews" });
      return { success: false, message: 'Authentication required' };
    }

    try {
       // Remove manual token fetching
      // const token = localStorage.getItem('token');
      // if (!token) { ... } // Replaced by isAuthenticated check above

      // Use api instance, remove manual headers
      await api.delete(
        `/api/reviews/${reviewId}`
        // { headers: { Authorization: `Bearer ${token}` } } // Remove manual headers
      );

      toast.success("Review Deleted", {
        description: "Your review has been deleted",
      });

      return { success: true, message: 'Review deleted successfully' };
    } catch (err: any) {
       // Keep existing error handling
       if (axios.isAxiosError(err) && err.response?.status === 401) {
         toast.error("Authentication error. Please sign in again.");
       }
      const errorMessage = err.response?.data?.detail || 'Failed to delete review';
      setError(errorMessage);
      toast.error(errorMessage, { description: "Failed to delete review" });
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Add isAuthenticated dependency

  const likeReview = useCallback(async (
    reviewId: string
  ): Promise<{ success: boolean; message: string }> => {

     // Check authentication status using useAuth
     // No setLoading/setError needed here? Add if desired.
    if (!isAuthenticated) {
      toast.error('Authentication required', {
        description: "Please sign in to like reviews"
      });
      return { success: false, message: 'Authentication required' };
    }

    try {
      // Remove manual token fetching
      // const token = localStorage.getItem('token');
      // if (!token) { ... } // Replaced by isAuthenticated check above

      console.log('Attempting to like review:', reviewId);

      // Use api instance, remove manual headers
      const response = await api.post(
        `/api/reviews/${reviewId}/like`
         // {}, // Empty payload needed? Confirm API.
        // { headers: { Authorization: `Bearer ${token}` } } // Remove manual headers
      );

      console.log('Like response:', response.data);
      // Consider adding a success toast?
      return { success: true, message: response.data.message };
    } catch (err: any) {
       // Keep existing error handling
       if (axios.isAxiosError(err) && err.response?.status === 401) {
         toast.error("Authentication error. Please sign in again.");
       }
      console.error('Error liking review:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to like review';
      toast.error(errorMessage, { description: "Failed to like review" });
      return { success: false, message: errorMessage };
    }
     // No finally block with setLoading needed? Add if loading state was added.
  }, [isAuthenticated]); // Add isAuthenticated dependency

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