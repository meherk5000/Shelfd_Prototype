"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReviews } from "@/lib/hooks/use-reviews";
import { useRatings } from "@/lib/hooks/use-ratings";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ShelfStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaId: string;
  mediaType: string;
  mediaTitle: string;
  mediaImage?: string;
  onComplete?: () => void;
}

export function ShelfStatusChangeDialog({
  open,
  onOpenChange,
  mediaId,
  mediaType,
  mediaTitle,
  mediaImage,
  onComplete,
}: ShelfStatusChangeDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { submitReview } = useReviews();
  const { submitRating } = useRatings();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRating(0);
      setReview("");
    }
  }, [open]);

  const handleSkip = () => {
    onOpenChange(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      // Allow skipping but require rating if submitting
      handleSkip();
      return;
    }

    setSubmitting(true);
    try {
      // Debug the values being sent
      console.log(
        `Review submission - Media Type: ${mediaType}, Media ID: ${mediaId}, Rating: ${rating}`
      );

      let normalizedType;

      // Handle specific media types correctly
      if (mediaType === "Movies") {
        normalizedType = "MOVIE";
      } else if (mediaType === "TV Shows") {
        normalizedType = "tv";
      } else if (mediaType === "Books") {
        normalizedType = "BOOK";
      } else if (mediaType === "Articles") {
        normalizedType = "ARTICLE";
      } else {
        // Fallback to the previous logic for any other type
        normalizedType = mediaType
          .toUpperCase()
          .replace(/\s/g, "_")
          .replace(/S$/, "");
      }

      console.log(`Normalized media type: ${normalizedType}`);

      // Submit to both systems for compatibility
      // Try the new review system first
      const reviewResult = await submitReview(
        normalizedType,
        mediaId,
        rating,
        review || undefined,
        false // containsSpoilers parameter
      );

      // Also try the legacy system (will add to shelf if not there)
      const ratingResult = await submitRating(
        normalizedType,
        mediaId,
        rating,
        review || undefined,
        mediaTitle,
        mediaImage
      );

      // Use either result for UI feedback
      if (reviewResult.success || ratingResult.success) {
        onOpenChange(false);
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Would you like to rate and review?</DialogTitle>
          <DialogDescription>
            You've marked "{mediaTitle}" as finished. Would you like to rate it?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Your Rating</Label>
            <div className="flex justify-center py-2">
              <StarRating
                value={rating}
                onChange={setRating}
                size="lg"
                precision="quarter"
                showValue={true}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">
              Your Review{" "}
              <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="review"
              placeholder="What did you think about it?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
