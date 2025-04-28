"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getMovieDetails } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShelfButton } from "@/components/shelf-button";
import { ReviewForm } from "@/components/media/review-form";
import { ReviewList } from "@/components/media/review-list";
import {
  getUserReview,
  getMediaReviews,
  deleteReview,
} from "@/services/reviewService";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useShelf, ShelfStatus } from "@/lib/hooks/use-shelf";
import { ReviewData } from "@/lib/hooks/use-reviews";
import { UserReviewDisplay } from "@/components/media/UserReviewDisplay";

interface MovieDetailsData {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  genres: Array<{ id: number; name: string }>;
  poster_path: string;
  backdrop_path: string;
  production_companies: Array<{ id: number; name: string }>;
  status: string;
  budget: number;
  revenue: number;
  homepage?: string;
  credits?: {
    crew?: Array<{ job: string; name: string }>;
  };
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

const tabs = ["About", "Reviews & Rating", "Cast & Crew", "Similar Movies"];

export function MovieDetails({ id }: { id: number }) {
  const [movie, setMovie] = useState<MovieDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("About");
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [userReview, setUserReview] = useState<ReviewData | null>(null);
  const [refreshReviews, setRefreshReviews] = useState(0);
  const [shelfStatus, setShelfStatus] = useState<ShelfStatus | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const { addToShelf } = useShelf();

  const fetchMovieDetails = useCallback(async () => {
    try {
      const data = await getMovieDetails(id);
      setMovie(data);
    } catch (err) {
      console.error("Error fetching movie:", err);
      setError("Failed to load movie details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAllReviewData = useCallback(async () => {
    console.log("fetchAllReviewData called");
    setReviewsLoading(true);
    // setUserReview(null);
    setShelfStatus(null);
    setReviewStats(null);
    try {
      const allReviewsRes = await getMediaReviews("movie", id.toString());
      console.log("Fetched all reviews stats:", allReviewsRes.stats);
      setReviewStats(allReviewsRes.stats || null);

      if (isAuthenticated && user) {
        console.log("User is authenticated, fetching user review...");
        const userReviewRes = await getUserReview("movie", id.toString());
        console.log("getUserReview response:", userReviewRes);
        if (userReviewRes.exists && userReviewRes.review) {
          console.log(
            "User review EXISTS. Setting userReview state:",
            userReviewRes.review
          );
          setUserReview(userReviewRes.review);
          setShelfStatus(userReviewRes.shelf_status || ShelfStatus.FINISHED);
        } else {
          console.log(
            "User review DOES NOT exist. Setting userReview to null."
          );
          setUserReview(null);
          setShelfStatus(userReviewRes.shelf_status || null);
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
  }, [id, isAuthenticated, user]);

  const handleReviewSuccess = useCallback(
    async (reviewData?: ReviewData) => {
      console.log("[MovieDetails] Review success, handling updates...");
      const wasAddingReview = !userReview; // Capture before potential update

      // Immediate UI Update
      if (reviewData) {
        console.log(
          "[MovieDetails] Received review data, updating state immediately:",
          reviewData
        );
        setUserReview(reviewData);
      } else {
        console.log(
          "[MovieDetails] No direct review data received, will refetch."
        );
      }

      // Background Updates / Refetching
      // Ensure we refetch the review data after success
      await fetchAllReviewData();
      setRefreshReviews((prev) => prev + 1);

      // Add to Shelf (if needed)
      if (wasAddingReview && movie) {
        console.log(
          "[MovieDetails] Added a new review. Ensuring item is marked as FINISHED."
        );
        try {
          await addToShelf("Movies", ShelfStatus.FINISHED, {
            id: movie.id.toString(),
            title: movie.title,
            image_url: movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : undefined,
          });
          // Optionally refetch again
          // await fetchAllReviewData();
        } catch (error) {
          console.error(
            "[MovieDetails] Failed to update shelf status after review add:",
            error
          );
        }
      } else {
        console.log(
          "[MovieDetails] Review was updated (not added) or movie data missing."
        );
      }

      console.log("[MovieDetails] Review success handling finished.");
    },
    [
      fetchAllReviewData,
      userReview, // Still needed to determine wasAddingReview
      addToShelf,
      movie,
    ]
  );

  const handleDeleteReview = async () => {
    if (!userReview) return;
    console.log("[MovieDetails] Attempting to delete review:", userReview.id);
    try {
      const result = await deleteReview(userReview.id);
      if (result.success) {
        console.log("[MovieDetails] Review deleted successfully.");
        setUserReview(null);
        setRefreshReviews((prev) => prev + 1);
      } else {
        console.error("[MovieDetails] Failed to delete review:", result.error);
        // Optionally show a toast notification for the error
      }
    } catch (error) {
      console.error("[MovieDetails] Error calling deleteReview:", error);
      // Optionally show a toast notification for the error
    }
  };

  const handleShelfUpdate = useCallback(async () => {
    console.log("Shelf updated, triggering fetchAllReviewData");
    await fetchAllReviewData();
  }, [fetchAllReviewData]);

  useEffect(() => {
    fetchMovieDetails();
  }, [fetchMovieDetails]);

  useEffect(() => {
    fetchAllReviewData();
  }, [id, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || "Movie not found"}</p>
      </div>
    );
  }

  const director =
    movie.credits?.crew?.find((person) => person.job === "Director")?.name ||
    "";

  const shelfButtonItem = {
    id: movie.id.toString(),
    title: movie.title,
    image_url: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : undefined,
    creator: director,
  };

  return (
    <div className="container py-8 px-6 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        <div>
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <div>
          <MediaHeader
            title={movie.title}
            subtitle={`Released: ${new Date(movie.release_date).getFullYear()}`}
            rating={movie.vote_average}
            platformRating={reviewStats?.average_rating}
            tags={movie.genres.map((g) => g.name)}
            primaryAction={{
              label: "Want to Watch",
              onClick: () => {
                if (!isAuthenticated)
                  router.push(
                    `/auth/sign-in?returnUrl=${encodeURIComponent(
                      `/movies/${id}`
                    )}`
                  );
              },
              component: isAuthenticated ? (
                <ShelfButton
                  mediaType="Movies"
                  item={shelfButtonItem}
                  onShelfUpdated={handleShelfUpdate}
                />
              ) : undefined,
            }}
            secondaryActions={[
              {
                label: "Website",
                onClick: () =>
                  movie.homepage && window.open(movie.homepage, "_blank"),
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
                <p className="text-muted-foreground">{movie.overview}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="font-medium">Release Date</dt>
                    <dd className="text-muted-foreground">
                      {new Date(movie.release_date).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Runtime</dt>
                    <dd className="text-muted-foreground">
                      {movie.runtime} minutes
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Status</dt>
                    <dd className="text-muted-foreground">{movie.status}</dd>
                  </div>
                  {movie.budget > 0 && (
                    <div>
                      <dt className="font-medium">Budget</dt>
                      <dd className="text-muted-foreground">
                        ${movie.budget.toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {movie.revenue > 0 && (
                    <div>
                      <dt className="font-medium">Revenue</dt>
                      <dd className="text-muted-foreground">
                        ${movie.revenue.toLocaleString()}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-medium">Production Companies</dt>
                    <dd className="text-muted-foreground">
                      {movie.production_companies.map((c) => c.name).join(", ")}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          )}

          {activeTab === "Reviews & Rating" && (
            <div>
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Community Rating</h2>
                {reviewsLoading && !reviewStats && (
                  <Skeleton className="h-8 w-48" />
                )}
                {!reviewsLoading && reviewStats && (
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

              <section className="mb-8">
                {(authLoading || reviewsLoading) && (
                  <Skeleton className="h-40 w-full" />
                )}

                {!authLoading && !reviewsLoading && (
                  <>
                    {!isAuthenticated ? (
                      <div className="bg-muted p-6 rounded-lg text-center">
                        <p className="font-medium mb-2">
                          Sign in to rate and review this movie
                        </p>
                        <Button
                          onClick={() =>
                            router.push(
                              `/auth/sign-in?returnUrl=${encodeURIComponent(
                                `/movies/${id}`
                              )}`
                            )
                          }
                        >
                          Sign In
                        </Button>
                      </div>
                    ) : userReview ? (
                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Your Review</h2>
                        <UserReviewDisplay
                          review={userReview}
                          onEdit={() => {
                            // Edit functionality not implemented
                            console.warn("Edit functionality not implemented.");
                          }}
                          onDelete={handleDeleteReview}
                        />
                      </div>
                    ) : (
                      <ReviewForm
                        mediaId={id.toString()}
                        mediaType="movie"
                        onSuccess={handleReviewSuccess}
                        mediaTitle={movie.title}
                        mediaImageUrl={shelfButtonItem.image_url}
                        mediaCreator={shelfButtonItem.creator}
                      />
                    )}
                  </>
                )}
              </section>

              <Separator className="my-6" />

              <ReviewList
                mediaId={id.toString()}
                mediaType="movie"
                refreshTrigger={refreshReviews}
              />
            </div>
          )}

          {activeTab === "Cast & Crew" && (
            <div>
              <p className="text-muted-foreground">
                Cast & Crew information coming soon.
              </p>
            </div>
          )}

          {activeTab === "Similar Movies" && (
            <div>
              <p className="text-muted-foreground">
                Similar movies content coming soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
