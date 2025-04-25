import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReactElement } from "react";

interface MediaHeaderProps {
  title: string;
  subtitle?: string;
  rating?: number; // Rating from external source (TMDB/Google)
  platformRating?: number | null; // Average rating from our platform
  tags?: string[];
  primaryAction?: {
    label: string;
    onClick: () => void;
    component?: ReactElement;
  };
  secondaryActions?: {
    label: string;
    onClick: () => void;
    component?: ReactElement;
  }[];
}

const isReactElement = (value: any): value is ReactElement => {
  return value?.$$typeof === Symbol.for("react.element");
};

export function MediaHeader({
  title,
  subtitle,
  rating, // Original rating - Keep prop for potential future use, but ignore in logic
  platformRating, // Use only this
  tags,
  primaryAction,
  secondaryActions,
}: MediaHeaderProps) {
  // Determine which rating to display and its source
  const hasValidPlatformRating =
    platformRating !== null &&
    platformRating !== undefined &&
    platformRating > 0;
  // const hasValidSourceRating = rating !== null && rating !== undefined && rating > 0; // REMOVE source check

  let displayRating: number | null = null;
  let showNoRatingsMessage = false;

  if (hasValidPlatformRating) {
    displayRating = platformRating;
  } else {
    // Only show "No ratings yet" if platformRating exists but is <= 0, or explicitly null/undefined
    if (platformRating !== null && platformRating !== undefined) {
      showNoRatingsMessage = true; // Indicate no ratings yet
    }
    // If platformRating is null/undefined initially, don't show anything yet
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {/* Updated rating display logic - Only uses platformRating */}
      <div className="flex items-center gap-2 h-6">
        {displayRating !== null && (
          <>
            <span className="font-semibold text-lg">
              {displayRating.toFixed(1)}
            </span>
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </>
        )}
        {showNoRatingsMessage && (
          <span className="text-muted-foreground text-sm">
            0.0 No ratings yet
          </span>
        )}
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={`${tag}-${index}`} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {primaryAction &&
          (primaryAction.component ? (
            <div>{primaryAction.component}</div>
          ) : (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          ))}
        {secondaryActions && secondaryActions.length > 0 && (
          <div className="flex gap-2">
            {secondaryActions.map((action) =>
              action.component ? (
                <div key={action.label}>{action.component}</div>
              ) : (
                <Button
                  key={action.label}
                  variant="outline"
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
