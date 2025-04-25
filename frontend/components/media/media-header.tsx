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
  rating, // Original rating
  platformRating, // New prop for platform average
  tags,
  primaryAction,
  secondaryActions,
}: MediaHeaderProps) {
  // Determine which rating to display
  // Prioritize platform rating if available and valid (e.g., > 0)
  const displayRating =
    platformRating !== null &&
    platformRating !== undefined &&
    platformRating > 0
      ? platformRating
      : rating; // Fallback to original rating
  const ratingSourceLabel =
    platformRating !== null &&
    platformRating !== undefined &&
    platformRating > 0
      ? "(Shelfd Avg)"
      : "(Source Avg)";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {/* Updated rating display logic */}
      {displayRating !== undefined && displayRating !== null && (
        <div className="flex items-center gap-2">
          {/* Display rating rounded to 1 decimal place */}
          <span className="font-semibold">{displayRating.toFixed(1)}</span>
          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          {/* Optionally show source label */}
          {/* <span className="text-xs text-muted-foreground">{ratingSourceLabel}</span> */}
        </div>
      )}

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
