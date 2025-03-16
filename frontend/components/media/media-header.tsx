import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReactElement } from "react";

interface MediaHeaderProps {
  title: string;
  subtitle?: string;
  rating?: number;
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
  rating,
  tags,
  primaryAction,
  secondaryActions,
}: MediaHeaderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {rating && (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{rating.toFixed(2)}</span>
          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
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
