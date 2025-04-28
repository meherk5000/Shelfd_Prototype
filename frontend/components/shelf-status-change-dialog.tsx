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
import { ReviewForm } from "@/components/media/review-form";

interface ShelfStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaId: string;
  mediaType: string;
  mediaTitle: string;
  mediaImage?: string;
  mediaCreator?: string;
  onComplete?: () => void;
}

// Function to normalize media type string to enum value
const normalizeMediaType = (
  mediaType: string
): "book" | "movie" | "tv" | null => {
  const lowerType = mediaType.toLowerCase();
  if (lowerType.includes("book")) return "book";
  if (lowerType.includes("movie")) return "movie";
  if (lowerType.includes("tv")) return "tv"; // Assuming "TV Shows" maps to "tv"
  return null; // Return null for unsupported types like Articles
};

export function ShelfStatusChangeDialog({
  open,
  onOpenChange,
  mediaId,
  mediaType,
  mediaTitle,
  mediaImage,
  mediaCreator,
  onComplete,
}: ShelfStatusChangeDialogProps) {
  const normalizedMediaType = normalizeMediaType(mediaType);

  const handleClose = () => {
    onOpenChange(false);
    // Revert: Call onComplete directly if skipping
    if (onComplete) {
      console.log(
        "[ShelfStatusChangeDialog] Calling onComplete (from skip)..."
      );
      onComplete();
      console.log("[ShelfStatusChangeDialog] onComplete (from skip) finished.");
    }
  };

  const handleReviewSubmitSuccess = () => {
    console.log("[ShelfStatusChangeDialog] handleReviewSubmitSuccess called");
    onOpenChange(false); // Close dialog first
    // Revert: Call onComplete directly after closing
    if (onComplete) {
      console.log("[ShelfStatusChangeDialog] Calling onComplete...");
      onComplete();
      console.log("[ShelfStatusChangeDialog] onComplete finished.");
      // --- Add page reload ---
      window.location.reload();
      // --- End page reload ---
    }
  };

  // Don't render dialog content if media type isn't supported for reviews
  if (!normalizedMediaType) {
    // If dialog was told to open for unsupported type, immediately call onComplete and don't render
    useEffect(() => {
      if (open && onComplete) {
        onComplete();
      }
    }, [open, onComplete]);
    return null;
  }

  return (
    // Prevent closing via overlay click to force explicit Skip/Submit
    <Dialog
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate & Review</DialogTitle>
          <DialogDescription>
            You've marked "{mediaTitle}" as finished. Add your rating and review
            below.
          </DialogDescription>
        </DialogHeader>

        {/* Use the new ReviewForm */}
        <div className="py-4">
          <ReviewForm
            mediaId={mediaId}
            mediaType={normalizedMediaType}
            onSuccess={handleReviewSubmitSuccess}
            // Pass down the metadata props
            mediaTitle={mediaTitle}
            mediaImageUrl={mediaImage}
            mediaCreator={mediaCreator}
            // We assume it's a new review here, so no initial values or reviewId needed
            // We also assume the item *is* now on a shelf (Finished) for the form to be active
          />
        </div>

        <DialogFooter>
          {/* Skip button closes dialog and triggers shelf update via onComplete */}
          <Button variant="outline" onClick={handleClose}>
            Skip
          </Button>
          {/* The submit button is now inside ReviewForm */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
