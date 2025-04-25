"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StarRatingInput from "@/components/ui/StarRatingInput";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageSquare } from "lucide-react"; // Assuming icons for like/comment
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Match the structure from ReviewService.get_media_reviews
export interface ReviewItemData {
  id: string;
  user_id: string;
  username: string;
  user_avatar: string | null;
  rating: number;
  review_text: string | null;
  created_at: string; // ISO string
  updated_at: string | null; // ISO string
  likes_count: number;
  has_liked: boolean;
  // Add contains_spoilers if needed
}

interface ReviewItemProps {
  review: ReviewItemData;
  isCurrentUserReview?: boolean;
  onLikeToggle?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
  className?: string;
}

const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  isCurrentUserReview = false,
  onLikeToggle,
  onDelete,
  className,
}) => {
  const handleLike = () => {
    if (onLikeToggle) {
      onLikeToggle(review.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(review.id);
    }
  };

  return (
    <div
      className={cn(
        "flex space-x-4 py-4 border-b last:border-b-0",
        isCurrentUserReview && "bg-muted/50 p-4 rounded-lg", // Highlight user's own review
        className
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage
          src={review.user_avatar ?? undefined}
          alt={review.username}
        />
        <AvatarFallback>
          {review.username?.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold">{review.username}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {dayjs(review.created_at).fromNow()}
              {review.updated_at &&
                review.updated_at !== review.created_at &&
                " (edited)"}
            </span>
          </div>
          {isCurrentUserReview && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-xs text-destructive"
            >
              Delete
            </Button>
          )}
        </div>
        <StarRatingInput
          initialValue={review.rating}
          onChange={() => {}}
          readOnly
          size={16}
        />
        {review.review_text && (
          <p className="text-sm whitespace-pre-wrap">{review.review_text}</p>
        )}
        <div className="flex items-center space-x-4 pt-1">
          {onLikeToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                "text-xs h-auto p-1",
                review.has_liked ? "text-primary" : "text-muted-foreground"
              )}
            >
              <ThumbsUp size={14} className="mr-1" />
              {review.likes_count}
            </Button>
          )}
          {/* Add comment button/feature later if needed */}
          {/* <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-1">
            <MessageSquare size={14} className="mr-1" />
            Comment
          </Button> */}
        </div>
      </div>
    </div>
  );
};

export default ReviewItem;
