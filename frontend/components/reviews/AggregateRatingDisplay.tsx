"use client";

import React from "react";
import StarRatingInput from "@/components/ui/StarRatingInput"; // Use the input component in read-only mode
import { cn } from "@/lib/utils";

interface AggregateRatingDisplayProps {
  averageRating: number;
  totalReviews: number;
  className?: string;
}

const AggregateRatingDisplay: React.FC<AggregateRatingDisplayProps> = ({
  averageRating,
  totalReviews,
  className,
}) => {
  if (totalReviews === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No reviews yet.
      </div>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <StarRatingInput
        initialValue={averageRating}
        onChange={() => {}} // No-op for read-only
        readOnly
        size={20} // Slightly smaller for display
      />
      <span className="font-medium">{averageRating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">
        ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
      </span>
    </div>
  );
};

export default AggregateRatingDisplay;
