"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming shadcn/ui setup

interface StarRatingInputProps {
  initialValue?: number;
  onChange: (value: number) => void;
  size?: number;
  className?: string;
  readOnly?: boolean;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({
  initialValue = 0,
  onChange,
  size = 24,
  className,
  readOnly = false,
}) => {
  const [rating, setRating] = useState<number>(initialValue);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleStarClick = (value: number) => {
    if (readOnly) return;
    const newRating = rating === value ? 0 : value; // Click again to clear
    setRating(newRating);
    onChange(newRating);
  };

  const handleMouseEnter = (value: number) => {
    if (readOnly) return;
    setHoverRating(value);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(null);
  };

  const totalStars = 5;

  return (
    <div className={cn("flex items-center space-x-0.5", className)}>
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        const currentRating = hoverRating ?? rating;

        // Determine star fill type based on hover/selected rating
        let fillType = "none";
        if (currentRating >= starValue) {
          fillType = "full";
        } else if (currentRating >= starValue - 0.5) {
          fillType = "half";
        }

        return (
          <div
            key={starValue}
            className={cn(
              "relative cursor-pointer",
              readOnly && "cursor-default"
            )}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
          >
            {/* Background empty star */}
            <Star
              size={size}
              className="text-muted-foreground fill-transparent stroke-current"
              strokeWidth={1.5}
            />
            {/* Foreground filled/half-filled star */}
            <div
              className={cn(
                "absolute inset-0 overflow-hidden",
                fillType === "full"
                  ? "w-full"
                  : fillType === "half"
                  ? "w-1/2"
                  : "w-0"
              )}
            >
              <Star
                size={size}
                className="text-yellow-400 fill-current stroke-current"
                strokeWidth={1.5}
              />
            </div>
            {/* Clickable areas for half and full star */}
            {!readOnly && (
              <>
                {/* Half star click area */}
                <div
                  className="absolute inset-y-0 left-0 w-1/2 z-10"
                  onClick={() => handleStarClick(starValue - 0.5)}
                  onMouseEnter={() => handleMouseEnter(starValue - 0.5)}
                />
                {/* Full star click area */}
                <div
                  className="absolute inset-y-0 right-0 w-1/2 z-10"
                  onClick={() => handleStarClick(starValue)}
                  onMouseEnter={() => handleMouseEnter(starValue)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StarRatingInput;
