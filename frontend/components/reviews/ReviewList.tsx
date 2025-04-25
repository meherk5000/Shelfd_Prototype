"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReviewItem, { ReviewItemData } from "./ReviewItem";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// Import API service functions
import {
  getMediaReviews,
  likeReview,
  deleteReview,
} from "@/services/reviewService";

interface ReviewListProps {
  mediaId: string;
  mediaType: "book" | "movie" | "tv";
  currentUserId?: string | undefined; // Allow undefined explicitly
  initialReviews?: ReviewItemData[]; // Optional initial data
  className?: string;
}

const ReviewList: React.FC<ReviewListProps> = ({
  mediaId,
  mediaType,
  currentUserId,
  initialReviews = [],
  className,
}) => {
  const [reviews, setReviews] = useState<ReviewItemData[]>(initialReviews);
  const [isLoading, setIsLoading] = useState<boolean>(!initialReviews.length);
  const [error, setError] = useState<string | null>(null);
  // Add state for pagination/sorting if needed

  useEffect(() => {
    setReviews(initialReviews);
    // If parent provides new initialReviews, stop loading
    if (initialReviews.length > 0) {
      setIsLoading(false);
    }
  }, [initialReviews]);

  const fetchReviews = useCallback(async () => {
    // This is now mainly for explicit refresh or initial load if needed
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching reviews for ${mediaType}/${mediaId}`);
      // Use the actual API call
      const response = await getMediaReviews(mediaType, mediaId);

      if (response.reviews) {
        setReviews(response.reviews); // Update local state
      } else {
        setError("Failed to load reviews.");
        setReviews([]);
      }
    } catch (err: any) {
      console.error("Error fetching reviews:", err);
      const errorMsg =
        err.response?.data?.detail ||
        "An error occurred while loading reviews.";
      setError(errorMsg);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [mediaId, mediaType]);

  useEffect(() => {
    // Fetch reviews only if initialReviews are empty on mount
    if (initialReviews.length === 0) {
      fetchReviews();
    }
  }, [fetchReviews, initialReviews.length]); // Run only on mount if initialReviews empty

  const handleLikeToggle = async (reviewId: string) => {
    const originalReviews = reviews;
    // Optimistic UI update
    setReviews((prevReviews) =>
      prevReviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              has_liked: !r.has_liked,
              likes_count: r.has_liked
                ? Math.max(0, r.likes_count - 1)
                : r.likes_count + 1,
            }
          : r
      )
    );

    try {
      console.log(`Toggling like for review ${reviewId}`);
      await likeReview(reviewId); // Actual API call
      // Optional: Could refetch for confirmation, but optimistic is usually enough
      // toast.success("Like status updated"); // Maybe too noisy
    } catch (error: any) {
      console.error("Failed to toggle like:", error);
      const errorMsg =
        error.response?.data?.detail || "Failed to update like status.";
      toast.error(errorMsg);
      // Revert optimistic update on error
      setReviews(originalReviews);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete your review?")) return;

    const originalReviews = reviews;
    // Optimistic UI update
    setReviews((prevReviews) => prevReviews.filter((r) => r.id !== reviewId));

    try {
      console.log(`Deleting review ${reviewId}`);
      await deleteReview(reviewId); // Actual API call
      toast.success("Review deleted.");
      // Parent component (MoviePage) should handle refetching via onSubmitSuccess callback
    } catch (error: any) {
      console.error("Failed to delete review:", error);
      const errorMsg =
        error.response?.data?.detail || "Failed to delete review.";
      toast.error(errorMsg);
      // Revert optimistic update
      setReviews(originalReviews);
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex space-x-4 py-4 border-b last:border-b-0">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-center py-4">{error}</div>;
  }

  if (reviews.length === 0 && !isLoading) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No reviews yet.
      </div>
    );
  }

  // Separate current user's review
  const currentUserReview = currentUserId
    ? reviews.find((r) => r.user_id === currentUserId)
    : undefined;
  const otherReviews = reviews.filter((r) => r.user_id !== currentUserId);

  return (
    <div className={className}>
      {/* Display current user's review first if it exists */}
      {currentUserReview && (
        <ReviewItem
          key={currentUserReview.id}
          review={currentUserReview}
          isCurrentUserReview={true}
          onLikeToggle={handleLikeToggle}
          onDelete={handleDeleteReview}
        />
      )}
      {/* Display other reviews */}
      {otherReviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          isCurrentUserReview={false}
          onLikeToggle={handleLikeToggle}
        />
      ))}
      {/* Add pagination controls here if implementing */}
    </div>
  );
};

export default ReviewList;
