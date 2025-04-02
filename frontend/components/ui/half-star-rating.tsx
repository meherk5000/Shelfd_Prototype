import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, StarHalf } from "lucide-react";

interface HalfStarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HalfStarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = "md",
  className,
}: HalfStarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  // Determine star sizes based on the size prop
  const starSizes = {
    sm: { width: 16, height: 16 },
    md: { width: 20, height: 20 },
    lg: { width: 24, height: 24 },
  };

  const { width, height } = starSizes[size];

  // Convert display value to a number between 0 and 10 (for half stars)
  const displayValue = hoverValue !== null ? hoverValue : value;

  // Generate stars array - we need 5 stars
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    starIndex: number
  ) => {
    if (readOnly) return;

    // Get the position within the star
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const halfWidth = rect.width / 2;

    // If mouse is in the left half, set to whole number - 0.5
    // If mouse is in the right half, set to whole number
    const newValue = x < halfWidth ? starIndex - 0.5 : starIndex;
    setHoverValue(newValue);
  };

  const handleClick = (starValue: number) => {
    if (readOnly || !onChange) return;
    onChange(starValue);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        readOnly ? "pointer-events-none" : "cursor-pointer",
        className
      )}
      onMouseLeave={handleMouseLeave}
    >
      {stars.map((star) => {
        const isFullyFilled = displayValue >= star;
        const isHalfFilled = !isFullyFilled && displayValue >= star - 0.5;

        return (
          <div
            key={star}
            className="relative"
            onMouseMove={(e) => handleMouseMove(e, star)}
            onClick={() => handleClick(hoverValue || value)}
          >
            {/* Base star (gray) */}
            <Star
              className="text-gray-300"
              width={width}
              height={height}
              strokeWidth={1.5}
            />

            {/* Filled overlay */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                width: isFullyFilled ? "100%" : isHalfFilled ? "50%" : "0%",
              }}
            >
              <Star
                className="text-yellow-400 fill-yellow-400"
                width={width}
                height={height}
                strokeWidth={1.5}
              />
            </div>
          </div>
        );
      })}

      {/* Display the numeric value if needed */}
      {!readOnly && (
        <span className="ml-2 text-sm text-gray-600">
          {displayValue ? displayValue.toFixed(1) : "0.0"}
        </span>
      )}
    </div>
  );
}
