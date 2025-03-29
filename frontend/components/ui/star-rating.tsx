"use client";

import { useState, useCallback, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  precision?: "full" | "half" | "quarter";
  className?: string;
  showValue?: boolean;
}

export function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = "md",
  precision = "quarter",
  className,
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const maxStars = 5;

  const sizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const starSize = sizes[size];

  // Precision steps
  const precisionMap = {
    full: 1,
    half: 0.5,
    quarter: 0.25,
  };

  const step = precisionMap[precision];

  // Function to handle mouse movement over a star
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
      if (readOnly) return;

      const { left, width } = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - left) / width;

      let rating;
      if (precision === "full") {
        rating = starIndex + 1; // Full star only
      } else if (precision === "half") {
        rating = starIndex + (percent < 0.5 ? 0.5 : 1); // Half or full
      } else {
        // Quarter precision
        if (percent < 0.25) {
          rating = starIndex + 0.25;
        } else if (percent < 0.5) {
          rating = starIndex + 0.5;
        } else if (percent < 0.75) {
          rating = starIndex + 0.75;
        } else {
          rating = starIndex + 1;
        }
      }

      setHoverRating(rating);
    },
    [precision, readOnly]
  );

  // Reset hover rating when mouse leaves the component
  const handleMouseLeave = useCallback(() => {
    if (!readOnly) {
      setHoverRating(0);
    }
  }, [readOnly]);

  // Handle click to set the actual rating
  const handleClick = useCallback(() => {
    if (!readOnly && onChange) {
      onChange(hoverRating);
    }
  }, [hoverRating, onChange, readOnly]);

  // Render a single star
  const renderStar = useCallback(
    (index: number) => {
      const activeRating = hoverRating || value;
      const currentStarPosition = index + 1;
      const fillPercentage = Math.max(0, Math.min(1, activeRating - index));

      const isFilled = fillPercentage > 0;
      const isPartialFilled = fillPercentage > 0 && fillPercentage < 1;

      const percentFilled = isPartialFilled ? `${fillPercentage * 100}%` : "0%";

      return (
        <div
          key={index}
          className={cn(
            "relative cursor-pointer",
            readOnly && "cursor-default"
          )}
          onMouseMove={(e) => handleMouseMove(e, index)}
          onClick={handleClick}
        >
          {/* Background star (empty) */}
          <Star
            className={cn(
              starSize,
              "text-gray-300 dark:text-gray-600",
              !readOnly && "transition-transform hover:scale-110"
            )}
          />

          {/* Filled star overlay */}
          {isFilled && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: isPartialFilled ? percentFilled : "100%" }}
            >
              <Star
                className={cn(starSize, "fill-yellow-400 text-yellow-400")}
              />
            </div>
          )}
        </div>
      );
    },
    [hoverRating, value, starSize, readOnly, handleClick, handleMouseMove]
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex" onMouseLeave={handleMouseLeave}>
        {[...Array(maxStars)].map((_, index) => renderStar(index))}

        {showValue && value > 0 && (
          <span className="text-sm font-medium ml-2 self-center">
            {value.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
