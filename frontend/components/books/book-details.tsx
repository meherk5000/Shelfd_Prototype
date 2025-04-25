"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getBookDetails } from "@/lib/api";
import { ShelfButton } from "@/components/shelf-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Import Review components from the shared location
import { ReviewForm } from "@/components/media/review-form";
import { ReviewList } from "@/components/media/review-list";

// Import hooks and services
import { useAuth } from "@/lib/context/AuthContext"; // Use custom auth context
import { getUserReview, getMediaReviews } from "@/services/reviewService"; // Keep service import
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { useShelf, ShelfStatus } from "@/lib/hooks/use-shelf"; // Import useShelf hook AND ShelfStatus enum

// Interface for the book data itself (keep as is)
interface BookDetailsData {
  id: string;
  title: string;
  author: string;
  description: string;
  rating?: number;
  tags: string[];
  image_url?: string;
  publishedDate?: string;
  pageCount?: number;
  language?: string;
  previewLink?: string;
}

// Simplified type for the user's review (matching MovieDetails pattern)
interface UserReview {
  id: string;
  rating: number;
  review_text: string;
  contains_spoilers?: boolean;
  // Add other fields if ReviewForm needs them
}

// Define type for aggregate stats (matching backend)
interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

const tabs = ["About", "Reviews & Rating", "Similar Books"];

export function BookDetails({ id }: { id: string }) {
  const [book, setBook] = useState<BookDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("About");
  const { user, isAuthenticated, loading: authLoading } = useAuth(); // Use custom hook
  const router = useRouter();
  const { addToShelf } = useShelf(); // Get addToShelf function from the hook

  // Simplified state for reviews (matching MovieDetails)
  const [userReview, setUserReview] = useState<UserReview | null>(null);
  const [refreshReviews, setRefreshReviews] = useState(0); // Trigger for ReviewList
  const [shelfStatus, setShelfStatus] = useState<ShelfStatus | null>(null); // Track shelf status

  // Add state for review stats
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true); // Separate loading for reviews

  const fetchBookDetails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookDetails(id);
      setBook(data);
    } catch (err) {
      console.error("Error fetching book:", err);
      setError("Failed to load book details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Renamed to fetchAllReviewData as it gets user review AND all reviews/stats
  const fetchAllReviewData = useCallback(async () => {
    console.log("fetchAllReviewData called"); // Log start
    setReviewsLoading(true);
    setUserReview(null); // Reset user review initially
    setShelfStatus(null); // Reset shelf status initially
    setReviewStats(null);

    try {
      // Fetch all reviews and stats first
      const allReviewsRes = await getMediaReviews("book", id);
      console.log("Fetched all reviews stats:", allReviewsRes.stats);
      setReviewStats(allReviewsRes.stats || null);

      // If authenticated, fetch the specific user's review
      if (isAuthenticated && user) {
        console.log("User is authenticated, fetching user review...");
        const userReviewRes = await getUserReview("book", id);
        console.log("getUserReview response:", userReviewRes);
        if (userReviewRes.exists && userReviewRes.review) {
          console.log(
            "User review EXISTS. Setting userReview state:",
            userReviewRes.review
          );
          setUserReview(userReviewRes.review);
          setShelfStatus(userReviewRes.shelf_status || ShelfStatus.FINISHED); // Set shelf status
        } else {
          console.log(
            "User review DOES NOT exist. Setting userReview to null."
          );
          setUserReview(null); // Explicitly set to null
          // Check if item is on *any* shelf even if not reviewed (this might need a separate API call/logic if ShelfButton doesn't manage it)
          // For now, we rely on the ReviewForm's internal check or assume it might be on a shelf.
          // A dedicated `checkIfInShelf(mediaType, mediaId)` API call might be better.
          // We need to know if it's on *any* shelf to allow adding a review.
          // Let's tentatively check the review stats response if it includes shelf status, otherwise set false.
          // This is a placeholder - ideally we'd have a direct shelf status check.
          setShelfStatus(userReviewRes.shelf_status || null); // Set shelf status to null or actual value
          console.log(
            "Setting shelfStatus state based on getUserReview response:",
            userReviewRes.shelf_status || null
          );
        }
      } else {
        console.log("User not authenticated, skipping user review fetch.");
      }
    } catch (error) {
      console.error("Error fetching review data:", error);
      setReviewStats(null);
      setUserReview(null);
      setShelfStatus(null);
    } finally {
      console.log("Finished fetchAllReviewData, setting reviewsLoading false.");
      setReviewsLoading(false);
    }
  }, [id, isAuthenticated, user]); // Keep only primitive/stable dependencies

  // Update handleReviewSuccess to accept optional reviewData
  const handleReviewSuccess = useCallback(
    async (reviewData?: UserReview) => {
      console.log("[BookDetails] Review success, handling updates...");
      // Capture the state *before* any updates, to know if it was an add action
      const wasAddingReview = !userReview;

      // --- Immediate UI Update ---
      if (reviewData) {
        console.log(
          "[BookDetails] Received review data, updating state immediately:",
          reviewData
        );
        setUserReview(reviewData);
      } else {
        // If no reviewData passed (e.g., from an update), rely on refetch
        console.log(
          "[BookDetails] No direct review data received, will refetch."
        );
      }

      // --- Background Updates / Refetching ---
      // Refetch all data to ensure stats and list are up-to-date
      await fetchAllReviewData();
      setRefreshReviews((prev) => prev + 1); // Trigger review list refresh

      // --- Add to Shelf (if needed) ---
      // Use the captured wasAddingReview state
      if (wasAddingReview && book) {
        console.log(
          "[BookDetails] Added a new review. Ensuring item is marked as FINISHED."
        );
        try {
          // Always set to FINISHED when a new review is added via the form.
          // addToShelf should handle updates correctly if it was already on another shelf.
          await addToShelf("Books", ShelfStatus.FINISHED, {
            id: book.id,
            title: book.title,
            image_url: book.image_url,
            creator: book.author,
          });
          // Optionally, refetch *again* if addToShelf doesn't trigger the necessary state update
          // await fetchAllReviewData(); // Might be redundant depending on useShelf behavior
        } catch (error) {
          console.error(
            "[BookDetails] Failed to update shelf status after review add:",
            error
          );
          // Optionally show an error toast
        }
      } else {
        console.log(
          "[BookDetails] Review was updated (not added) or book data missing."
        );
      }

      console.log("[BookDetails] Review success handling finished.");
    },
    [
      fetchAllReviewData,
      userReview, // Still needed to determine wasAddingReview
      addToShelf,
      book,
    ]
  );

  const handleShelfUpdate = useCallback(async () => {
    //setIsInShelf(true); // No longer assume, fetchAllReviewData will set it
    console.log("Shelf updated, triggering fetchAllReviewData");
    await fetchAllReviewData(); // Refetch review data when shelf status changes
  }, [fetchAllReviewData]);

  useEffect(() => {
    fetchBookDetails();
  }, [fetchBookDetails]);

  useEffect(() => {
    // Fetch review data when component mounts or auth state changes
    // REMOVE fetchAllReviewData from deps - let the hook manage its own deps
    fetchAllReviewData();
  }, [isAuthenticated, user, id]); // Depend on id, isAuthenticated, user directly

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || "Book not found"}</p>
      </div>
    );
  }

  const shelfButtonItem = {
    id: book.id,
    title: book.title,
    image_url: book.image_url,
    creator: book.author,
  };

  return (
    <div className="container py-8 px-6 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Book Cover */}
        <div>
          {book.image_url && (
            <img
              src={book.image_url}
              alt={book.title}
              className="w-full rounded-lg shadow-lg"
            />
          )}
        </div>

        {/* Book Info */}
        <div>
          <MediaHeader
            title={book.title}
            subtitle={`By ${book.author}`}
            rating={book.rating} // Original rating from Google Books
            platformRating={reviewStats?.average_rating} // Pass platform average rating
            tags={book.tags}
            primaryAction={{
              label: "Want to Read",
              onClick: () => {},
              component: isAuthenticated ? (
                <ShelfButton
                  mediaType="Books"
                  item={shelfButtonItem}
                  onShelfUpdated={handleShelfUpdate}
                />
              ) : undefined,
            }}
            secondaryActions={[
              {
                label: "Preview",
                onClick: () =>
                  book.previewLink && window.open(book.previewLink, "_blank"),
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-8">
        <MediaTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === "About" && (
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-2">Overview</h2>
                <p className="text-muted-foreground">{book.description}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {book.publishedDate && (
                    <div>
                      <dt className="font-medium">Published Date</dt>
                      <dd className="text-muted-foreground">
                        {book.publishedDate}
                      </dd>
                    </div>
                  )}
                  {book.pageCount && (
                    <div>
                      <dt className="font-medium">Pages</dt>
                      <dd className="text-muted-foreground">
                        {book.pageCount}
                      </dd>
                    </div>
                  )}
                  {book.language && (
                    <div>
                      <dt className="font-medium">Language</dt>
                      <dd className="text-muted-foreground">
                        {new Intl.DisplayNames(["en"], {
                          type: "language",
                        }).of(book.language)}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>
          )}

          {activeTab === "Reviews & Rating" && (
            <div>
              {/* Add Aggregate Rating Display Here */}
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Community Rating</h2>
                {reviewsLoading && !reviewStats && (
                  <Skeleton className="h-8 w-48" /> // Show skeleton while loading
                )}
                {!reviewsLoading && reviewStats && (
                  // We can display a more detailed breakdown here later
                  <p>
                    {reviewStats.average_rating.toFixed(1)} average rating from{" "}
                    {reviewStats.total_reviews} reviews.
                  </p>
                )}
                {!reviewsLoading && !reviewStats && (
                  <p className="text-sm text-muted-foreground">
                    No reviews yet.
                  </p>
                )}
              </section>

              {/* --- User Review Section --- */}
              <section className="mb-8">
                {/* Show skeleton while auth or reviews are loading initially */}
                {(authLoading || reviewsLoading) && (
                  <Skeleton className="h-40 w-full" />
                )}

                {/* If NOT loading auth AND reviews have finished loading */}
                {!authLoading && !reviewsLoading && (
                  <>
                    {!isAuthenticated ? (
                      // Show sign-in prompt if not authenticated
                      <div className="bg-muted p-6 rounded-lg text-center">
                        <p className="font-medium mb-2">
                          Sign in to rate and review this book
                        </p>
                        <Button
                          onClick={() =>
                            router.push(
                              `/auth/sign-in?returnUrl=${encodeURIComponent(
                                `/books/${id}`
                              )}`
                            )
                          }
                        >
                          Sign In
                        </Button>
                      </div>
                    ) : userReview ? (
                      // --- User HAS reviewed: Show EDIT form ---
                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Your Review</h2>
                        <ReviewForm
                          mediaId={id}
                          mediaType="book"
                          initialRating={userReview.rating}
                          initialReview={userReview.review_text}
                          initialContainsSpoilers={
                            userReview.contains_spoilers || false
                          }
                          reviewId={userReview.id}
                          onSuccess={handleReviewSuccess}
                          // Add onDelete prop if needed
                        />
                      </div>
                    ) : (
                      // --- User has NOT reviewed: Show ADD form ---
                      <ReviewForm
                        mediaId={id.toString()} // Ensure string
                        mediaType="book"
                        onSuccess={handleReviewSuccess}
                        // No longer need isInShelf here
                      />
                    )}
                  </>
                )}
              </section>

              <Separator className="my-6" />

              {/* Review List Component */}
              <ReviewList
                mediaId={id}
                mediaType="book"
                refreshTrigger={refreshReviews}
              />
            </div>
          )}

          {/* Placeholder for Similar Books tab */}
          {activeTab === "Similar Books" && (
            <div>
              <p>Similar books coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
