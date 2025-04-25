"use client";

import { useState, useEffect } from "react";
import { useReviews } from "@/lib/hooks/use-reviews";
import { HalfStarRating } from "@/components/ui/half-star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReviewFormProps {
  mediaId: string;
  mediaType: string;
  initialRating?: number;
  initialReview?: string;
  initialContainsSpoilers?: boolean;
  reviewId?: string;
  onSuccess?: (reviewData?: any) => void;
}

export function ReviewForm({
  mediaId,
  mediaType,
  initialRating = 0,
  initialReview = "",
  initialContainsSpoilers = false,
  reviewId,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState(initialReview);
  const [containsSpoilers, setContainsSpoilers] = useState(
    initialContainsSpoilers
  );
  const [submitting, setSubmitting] = useState(false);

  const { submitReview, updateReview, deleteReview } = useReviews();
  const { toast } = useToast();

  // Reset form when initial values change
  useEffect(() => {
    setRating(initialRating);
    setReview(initialReview);
    setContainsSpoilers(initialContainsSpoilers);
  }, [initialRating, initialReview, initialContainsSpoilers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    try {
      // If we have a reviewId, update the existing review
      if (reviewId) {
        const result = await updateReview(reviewId, {
          rating,
          reviewText: review.trim() || undefined,
          containsSpoilers,
        });

        if (result.success) {
          console.log(
            "[ReviewForm] Update success, calling onSuccess callback..."
          );
          onSuccess?.();
          console.log("[ReviewForm] onSuccess callback finished.");
        }
      } else {
        // Otherwise create a new review
        const result = await submitReview(
          mediaType,
          mediaId,
          rating,
          review.trim() || undefined,
          containsSpoilers
        );

        if (result.success) {
          console.log(
            "[ReviewForm] Submit success, calling onSuccess callback..."
          );
          onSuccess?.(result.review);
          console.log("[ReviewForm] onSuccess callback finished.");
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit your review. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!reviewId) return;

    if (!window.confirm("Are you sure you want to delete your review?")) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await deleteReview(reviewId);

      if (result.success) {
        setRating(0);
        setReview("");
        setContainsSpoilers(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete your review. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-lg">
            {reviewId ? "Edit Your Rating & Review" : "Add a Rating & Review"}
          </CardTitle>
          <CardDescription>
            Share your thoughts about this {mediaType.toLowerCase()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Your Rating</Label>
            <div className="pb-2">
              <HalfStarRating value={rating} onChange={setRating} size="lg" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">
              Review <span className="text-gray-400 text-sm">(optional)</span>
            </Label>
            <Textarea
              id="review"
              placeholder="Write your review here..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="spoilers"
              checked={containsSpoilers}
              onCheckedChange={(checked: boolean | "indeterminate") =>
                setContainsSpoilers(checked === true)
              }
            />
            <Label htmlFor="spoilers" className="text-sm cursor-pointer">
              This review contains spoilers
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          {reviewId && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={submitting}
            >
              Delete Review
            </Button>
          )}

          <Button type="submit" disabled={submitting || rating === 0}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save Rating & Review</>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
