"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getTVDetails } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShelfButton } from "@/components/shelf-button";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { ReviewForm } from "@/components/media/review-form";
import { ReviewList } from "@/components/media/review-list";

import { getUserReview, getMediaReviews } from "@/services/reviewService";

interface TVShowDetailsData {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  vote_average: number;
  genres: Array<{ id: number; name: string }>;
  poster_path: string;
  backdrop_path: string;
  networks: Array<{ id: number; name: string }>;
  status: string;
  homepage?: string;
  in_production: boolean;
  type: string;
}

interface UserReview {
  id: string;
  rating: number;
  review_text: string;
  contains_spoilers?: boolean;
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

const tabs = ["About", "Episodes", "Cast & Crew", "Reviews", "Similar Shows"];

export function TVShowDetails({ id }: { id: number }) {
  const [show, setShow] = useState<TVShowDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("About");
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [userReview, setUserReview] = useState<UserReview | null>(null);
  const [refreshReviews, setRefreshReviews] = useState(0);
  const [isInShelf, setIsInShelf] = useState(false);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const fetchTVDetails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTVDetails(id);
      setShow(data);
    } catch (err) {
      console.error("Error fetching TV show:", err);
      setError("Failed to load TV show details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAllReviewData = useCallback(async () => {
    setReviewsLoading(true);
    setUserReview(null);
    setReviewStats(null);
    try {
      const allReviewsRes = await getMediaReviews("tv", id.toString());
      setReviewStats(allReviewsRes.stats || null);

      if (isAuthenticated && user) {
        const userReviewRes = await getUserReview("tv", id.toString());
        if (userReviewRes.exists && userReviewRes.review) {
          setUserReview(userReviewRes.review);
          setIsInShelf(true);
        } else {
          setUserReview(null);
          setIsInShelf(false);
        }
      }
    } catch (error) {
      console.error("Error fetching review data:", error);
      setReviewStats(null);
      setUserReview(null);
    } finally {
      setReviewsLoading(false);
    }
  }, [id, isAuthenticated, user]);

  const handleReviewSuccess = useCallback(() => {
    fetchAllReviewData();
    setRefreshReviews((prev) => prev + 1);
  }, [fetchAllReviewData]);

  const handleShelfUpdate = useCallback(() => {
    setIsInShelf(true);
    fetchAllReviewData();
  }, [fetchAllReviewData]);

  useEffect(() => {
    fetchTVDetails();
  }, [fetchTVDetails]);

  useEffect(() => {
    fetchAllReviewData();
  }, [isAuthenticated, user, fetchAllReviewData]);

  const handleWantToWatch = () => {
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(`/tv/${id}`);
      router.push(`/auth/sign-in?returnUrl=${returnUrl}`);
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !show) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || "Failed to load TV show"}</AlertDescription>
      </Alert>
    );
  }

  const shelfButtonItem = {
    id: show.id.toString(),
    title: show.name,
    image_url: show.poster_path
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
      : undefined,
    creator: show.networks?.map((n) => n.name).join(", ") || "",
  };

  return (
    <div className="container py-8 px-6 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        <div>
          {show.poster_path && (
            <img
              src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
              alt={show.name}
              className="w-full rounded-lg shadow-lg"
            />
          )}
        </div>

        <div>
          <MediaHeader
            title={show.name}
            subtitle={`First aired: ${new Date(
              show.first_air_date
            ).getFullYear()}`}
            rating={show.vote_average}
            platformRating={reviewStats?.average_rating}
            tags={show.genres.map((g) => g.name)}
            primaryAction={{
              label: "Want to Watch",
              onClick: handleWantToWatch,
              component: isAuthenticated ? (
                <ShelfButton
                  mediaType="TV Shows"
                  item={shelfButtonItem}
                  onShelfUpdated={handleShelfUpdate}
                />
              ) : undefined,
            }}
            secondaryActions={[
              {
                label: "Website",
                onClick: () =>
                  show.homepage && window.open(show.homepage, "_blank"),
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
                <p className="text-muted-foreground">{show.overview}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="font-medium">First Aired</dt>
                    <dd className="text-muted-foreground">
                      {new Date(show.first_air_date).toLocaleDateString()}
                    </dd>
                  </div>
                  {show.last_air_date && (
                    <div>
                      <dt className="font-medium">Last Aired</dt>
                      <dd className="text-muted-foreground">
                        {new Date(show.last_air_date).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-medium">Status</dt>
                    <dd className="text-muted-foreground">{show.status}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Type</dt>
                    <dd className="text-muted-foreground">{show.type}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Number of Seasons</dt>
                    <dd className="text-muted-foreground">
                      {show.number_of_seasons}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Number of Episodes</dt>
                    <dd className="text-muted-foreground">
                      {show.number_of_episodes}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Networks</dt>
                    <dd className="text-muted-foreground">
                      {show.networks.map((n) => n.name).join(", ")}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          )}

          {activeTab === "Episodes" && (
            <div>
              <p>Episodes content coming soon...</p>
            </div>
          )}
          {activeTab === "Cast & Crew" && (
            <div>
              <p>Cast & Crew content coming soon...</p>
            </div>
          )}
          {activeTab === "Similar Shows" && (
            <div>
              <p>Similar Shows content coming soon...</p>
            </div>
          )}

          {activeTab === "Reviews" && (
            <div className="space-y-8">
              <section>
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

              {isAuthenticated && !authLoading ? (
                <ReviewForm
                  mediaId={id.toString()}
                  mediaType="tv"
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
                <div className="bg-muted p-6 rounded-lg text-center">
                  <p className="font-medium mb-2">
                    Sign in to rate and review this show
                  </p>
                  <Button
                    onClick={() =>
                      router.push(
                        `/auth/sign-in?returnUrl=${encodeURIComponent(
                          `/tv/${id}`
                        )}`
                      )
                    }
                  >
                    Sign In
                  </Button>
                </div>
              ) : (
                <Skeleton className="h-40 w-full" />
              )}

              <Separator className="my-6" />

              <ReviewList
                mediaId={id.toString()}
                mediaType="tv"
                refreshTrigger={refreshReviews}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
