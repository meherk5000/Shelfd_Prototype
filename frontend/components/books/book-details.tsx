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

  // Simplified state for reviews (matching MovieDetails)
  const [userReview, setUserReview] = useState<UserReview | null>(null);
  const [refreshReviews, setRefreshReviews] = useState(0); // Trigger for ReviewList
  const [isInShelf, setIsInShelf] = useState(false); // Add isInShelf state if ReviewForm needs it

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
    setReviewsLoading(true); // Start loading reviews
    setUserReview(null); // Reset user review initially
    setReviewStats(null);

    try {
      // Fetch all reviews and stats first
      const allReviewsRes = await getMediaReviews("book", id);
      setReviewStats(allReviewsRes.stats || null);
      // We don't need to store allReviews in state here if ReviewList fetches its own

      // If authenticated, fetch the specific user's review
      if (isAuthenticated && user) {
        const userReviewRes = await getUserReview("book", id);
        if (userReviewRes.exists && userReviewRes.review) {
          setUserReview(userReviewRes.review);
          setIsInShelf(true); // Assume in shelf if review exists
        } else {
          setUserReview(null);
          setIsInShelf(false);
        }
      }
    } catch (error) {
      console.error("Error fetching review data:", error);
      // Handle error state appropriately if needed
      setReviewStats(null); // Clear stats on error
      setUserReview(null);
    } finally {
      setReviewsLoading(false); // Finish loading reviews
    }
  }, [id, isAuthenticated, user]);

  const handleReviewSuccess = useCallback(() => {
    fetchAllReviewData(); // Refetch all data after submission
    setRefreshReviews((prev) => prev + 1); // Trigger review list refresh if needed
    console.log("Review success, triggering refresh...");
  }, [fetchAllReviewData]);

  const handleShelfUpdate = useCallback(() => {
    setIsInShelf(true); // Assume adding to shelf
    fetchAllReviewData(); // Refetch review data when shelf status changes
  }, [fetchAllReviewData]);

  useEffect(() => {
    fetchBookDetails();
  }, [fetchBookDetails]);

  useEffect(() => {
    // Fetch review data when component mounts or auth state changes
    fetchAllReviewData();
  }, [isAuthenticated, user, fetchAllReviewData]); // Depend on fetchAllReviewData

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
            <div className="space-y-8">
              {/* Add Aggregate Rating Display Here */}
              <section>
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

              {/* User Review Form */}
              {isAuthenticated && !authLoading ? (
                <ReviewForm
                  mediaId={id}
                  mediaType="book"
                  // Pass initial values from userReview state
                  initialRating={userReview?.rating || 0}
                  initialReview={userReview?.review_text || ""}
                  initialContainsSpoilers={
                    userReview?.contains_spoilers || false
                  }
                  reviewId={userReview?.id}
                  onSuccess={handleReviewSuccess}
                  isInShelf={isInShelf}
                />
              ) : !authLoading ? (
                // Show sign-in prompt if not authenticated and auth is not loading
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
              ) : (
                // Show loading skeleton while auth state is resolving
                <Skeleton className="h-40 w-full" />
              )}

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
