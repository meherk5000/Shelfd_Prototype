"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HalfStarRating } from "@/components/ui/half-star-rating"; // Readonly display
import { ReviewData } from "@/lib/hooks/use-reviews";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal } from "lucide-react";

interface UserReviewDisplayProps {
  review: ReviewData;
  onEdit: () => void;
  onDelete: () => void;
}

export function UserReviewDisplay({
  review,
  onEdit,
  onDelete,
}: UserReviewDisplayProps) {
  const timeAgo = review.updated_at
    ? formatDistanceToNow(new Date(review.updated_at), { addSuffix: true })
    : review.created_at
    ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true })
    : "";

  // Simple fallback for avatar
  const getInitials = (name: string | undefined | null): string => {
    if (!name || typeof name !== "string") {
      return "?"; // Return a default character if name is invalid
    }
    return (
      name
        .split(" ")
        .filter((n) => n) // Ensure no empty strings from multiple spaces
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "?"
    ); // Fallback if result is empty
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.user_avatar} alt={review.username} />
            <AvatarFallback>{getInitials(review.username)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base font-medium">
              {review.username}
            </CardTitle>
            <CardDescription className="text-xs">{timeAgo}</CardDescription>
          </div>
        </div>
        {/* Edit/Delete Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem> */}
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-3">
          <HalfStarRating value={review.rating} readOnly={true} size="sm" />
          <span className="text-sm font-semibold">
            {review.rating.toFixed(1)}
          </span>
        </div>
        {review.review_text && (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {review.review_text}
          </p>
        )}
        {review.contains_spoilers && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
            (Contains Spoilers)
          </p>
        )}
      </CardContent>
      {/* Optional Footer for likes etc. if needed later */}
      {/* <CardFooter>
        ...
      </CardFooter> */}
    </Card>
  );
}
