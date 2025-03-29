"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { ArrowRight, Save } from "lucide-react";
import { useRatings } from "@/lib/hooks/use-ratings";
import { useAuth } from "@/lib/context/AuthContext";

interface ReviewFormProps {
  mediaId: string;
  mediaType: string;
  initialRating?: number;
  initialReview?: string;
  onComplete?: () => void;
  inShelf?: boolean;
  onAddToShelf?: () => Promise<void>;
}

export function ReviewForm({
  mediaId,
  mediaType,
  initialRating = 0,
  initialReview = "",
  onComplete,
  inShelf = true,
  onAddToShelf,
}: ReviewFormProps) {
  const [rating, setRating] = useState<number>(initialRating || 0);
  const [review, setReview] = useState(initialReview || "");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { submitRating } = useRatings();

  useEffect(() => {
    // Update state when props change
    setRating(initialRating || 0);
    setReview(initialReview || "");
    setLoading(false);
  }, [initialRating, initialReview]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitRating(
        mediaType,
        mediaId,
        rating,
        review.trim() || undefined
      );

      if (result.success) {
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit your review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-pulse h-40 w-full bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!inShelf) {
    return (
      <Card className="w-full border-dashed border-2">
        <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-4 py-8">
          <p className="text-muted-foreground">
            Add this {mediaType.toLowerCase()} to your shelf to rate and review
            it
          </p>
          <Button onClick={onAddToShelf} className="mt-2">
            Add to Shelf <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          Your Rating & Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rating">Rating</Label>
          <div className="flex justify-center md:justify-start py-2">
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
            Review{" "}
            <span className="text-sm text-muted-foreground">(Optional)</span>
          </Label>
          <Textarea
            id="review"
            placeholder="Share your thoughts about this title..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full"
        >
          {submitting ? (
            <>Submitting...</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Rating & Review
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
