"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Layout } from "@/components/layout";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getTVDetails } from "@/lib/api"; // Corrected API function name
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ShelfButton } from "@/components/shelf-button";
import { useUser } from "@auth0/nextjs-auth0/client";

// Review Components and Service
import ReviewForm from "@/components/reviews/ReviewForm";
import AggregateRatingDisplay from "@/components/reviews/AggregateRatingDisplay";
import ReviewList from "@/components/reviews/ReviewList";
import { getUserReview, getMediaReviews } from "@/services/reviewService";
import { ReviewItemData } from "@/components/reviews/ReviewItem";

// Define TVShowData interface (adjust based on actual API response)
interface TVShowData {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  networks?: { id: number; name: string; logo_path?: string }[];
  created_by?: { id: number; name: string }[];
  // Add other relevant fields like number_of_seasons, number_of_episodes
}

// Define ReviewStats locally
interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: { [key: string]: number };
}
// Define UserReviewState locally
interface UserReviewState {
  review?: ReviewItemData | null;
  isLoading: boolean;
  error: string | null;
}
// Define AllReviewsState locally
interface AllReviewsState {
  reviews: ReviewItemData[];
  stats: ReviewStats | null;
  isLoading: boolean;
  error: string | null;
}

const tabs = [
  "About",
  "Reviews & Rating",
  "People you follow",
  "Posts",
  "Clubs",
  "Content Warnings",
];

export default function TVShowPage() {
  const [activeTab, setActiveTab] = useState("About");
  const [tvShow, setTvShow] = useState<TVShowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const params = useParams();
  const tvShowId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isLoading: authLoading } = useUser();

  // State for reviews
  const [userReviewState, setUserReviewState] = useState<UserReviewState>({
    review: undefined,
    isLoading: true,
    error: null,
  });
  const [allReviewsState, setAllReviewsState] = useState<AllReviewsState>({
    reviews: [],
    stats: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchShow = async () => {
      setLoading(true);
      setError(false);
      try {
        if (tvShowId) {
          const data = await getTVDetails(Number(tvShowId)); // Use correct API function
          setTvShow(data);
        } else {
          throw new Error("TV Show ID is undefined");
        }
      } catch (err) {
        console.error("Error fetching TV show:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (tvShowId) {
      fetchShow();
    }
  }, [tvShowId]);

  // Function to fetch review data
  const fetchReviewData = async () => {
    if (!tvShowId || !tvShow) return;

    setUserReviewState((prev) => ({ ...prev, isLoading: true, error: null }));
    setAllReviewsState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      let userReview = null;
      if (user && user.sub) {
        try {
          const userReviewRes = await getUserReview("tv", tvShowId);
          if (userReviewRes.exists && user.sub) {
            userReview = {
              id: userReviewRes.review.id,
              user_id: user.sub,
              username: user.nickname || user.name || "You",
              user_avatar: user.picture || null,
              rating: userReviewRes.review.rating,
              review_text: userReviewRes.review.review_text,
              created_at: userReviewRes.review.created_at,
              updated_at: userReviewRes.review.updated_at,
              likes_count: 0, // Placeholder
              has_liked: false, // Placeholder
            };
            setUserReviewState({
              review: userReview,
              isLoading: false,
              error: null,
            });
          } else {
            setUserReviewState({ review: null, isLoading: false, error: null });
          }
        } catch (err) {
          console.error("Error fetching user review:", err);
          setUserReviewState({
            review: undefined,
            isLoading: false,
            error: "Could not load your review.",
          });
        }
      } else {
        setUserReviewState({ review: null, isLoading: false, error: null });
      }

      const allReviewsRes = await getMediaReviews("tv", tvShowId);
      setAllReviewsState({
        reviews: allReviewsRes.reviews || [],
        stats: allReviewsRes.stats || null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching all reviews:", err);
      setAllReviewsState({
        reviews: [],
        stats: null,
        isLoading: false,
        error: "Could not load reviews.",
      });
      if (userReviewState.isLoading) {
        setUserReviewState((prev) => ({ ...prev, isLoading: false }));
      }
    }
  };

  useEffect(() => {
    // Fetch review data once TV show data is loaded
    if (!loading && tvShow) {
      fetchReviewData();
    }
  }, [loading, tvShow, user]);

  const handleReviewSubmitSuccess = () => {
    fetchReviewData();
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !tvShow) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl">
          <p>TV Show not found or an error occurred</p>
        </div>
      </Layout>
    );
  }

  // Extract relevant info for header and shelf button
  const firstAirYear = tvShow.first_air_date
    ? new Date(tvShow.first_air_date).getFullYear()
    : "";
  const network = tvShow.networks?.[0]?.name || "";
  const creator = tvShow.created_by?.[0]?.name || network; // Fallback to network if no creator
  const subtitle = `${firstAirYear ? `${firstAirYear} | ` : ""}${network}`;
  const tags = tvShow.genres?.map((genre) => genre.name) || [];

  const shelfButtonItem = {
    id: String(tvShow.id),
    title: tvShow.name,
    image_url: tvShow.poster_path
      ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}`
      : undefined,
    creator: creator, // Use primary creator or network
  };

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Poster Image */}
          <div>
            {tvShow.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${tvShow.poster_path}`}
                alt={tvShow.name}
                width={300}
                height={450}
                className="w-full rounded-lg"
              />
            ) : (
              <div className="w-full h-[450px] bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">No poster available</p>
              </div>
            )}
          </div>
          {/* Media Header */}
          <div>
            <MediaHeader
              title={tvShow.name}
              subtitle={subtitle}
              rating={tvShow.vote_average ? tvShow.vote_average / 2 : undefined}
              tags={tags}
              primaryAction={{
                label: "Want To Watch",
                onClick: () => {},
                component: (
                  <ShelfButton mediaType="TV Shows" item={shelfButtonItem} />
                ),
              }}
              // secondaryActions={ [ ... ] }
            />
          </div>
        </div>

        <div className="mt-8">
          <MediaTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="mt-6">
            {activeTab === "About" && (
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-2">Overview</h2>
                  <p className="text-muted-foreground">
                    {tvShow.overview || "No overview available."}
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-2">Cast</h2>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Eleanor Shellstrop – Kristen Bell</li>
                    <li>Chidi Anagonye – William Jackson Harper</li>
                    <li>Tahani Al-Jamil – Jameela Jamil</li>
                    <li>Jason Mendoza – Manny Jacinto</li>
                    <li>Michael – Ted Danson</li>
                    <li>Janet – D'Arcy Carden</li>
                  </ul>
                </section>
              </div>
            )}

            {activeTab === "Reviews & Rating" && (
              <div className="space-y-8">
                {/* Aggregate Rating Display */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">
                    Community Rating
                  </h2>
                  {allReviewsState.isLoading && !allReviewsState.stats && (
                    <Skeleton className="h-8 w-48" />
                  )}
                  {!allReviewsState.isLoading && allReviewsState.stats && (
                    <AggregateRatingDisplay
                      averageRating={allReviewsState.stats.average_rating}
                      totalReviews={allReviewsState.stats.total_reviews}
                    />
                  )}
                  {allReviewsState.error && !allReviewsState.isLoading && (
                    <p className="text-sm text-destructive">
                      {allReviewsState.error}
                    </p>
                  )}
                </section>
                {/* User Review Form */}
                {user && (
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Your Review</h2>
                    {userReviewState.isLoading && (
                      <Skeleton className="h-40 w-full" />
                    )}
                    {!userReviewState.isLoading && (
                      <ReviewForm
                        mediaId={tvShowId}
                        mediaType="tv"
                        initialRating={userReviewState.review?.rating || 0}
                        initialReviewText={
                          userReviewState.review?.review_text || ""
                        }
                        reviewId={userReviewState.review?.id}
                        onSubmitSuccess={handleReviewSubmitSuccess}
                        mediaTitle={tvShow.name}
                        mediaImageUrl={shelfButtonItem.image_url ?? undefined}
                        mediaCreator={creator ?? undefined}
                      />
                    )}
                    {userReviewState.error && !userReviewState.isLoading && (
                      <p className="text-sm text-destructive">
                        {userReviewState.error}
                      </p>
                    )}
                  </section>
                )}
                {!user && !authLoading && (
                  <p className="text-center text-muted-foreground">
                    Please log in to leave a review.
                  </p>
                )}
                {/* Review List */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">All Reviews</h2>
                  <ReviewList
                    mediaId={tvShowId}
                    mediaType="tv" // Correct media type
                    currentUserId={user?.sub ?? undefined}
                    initialReviews={allReviewsState.reviews}
                  />
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// --- Helper Functions / Interfaces ---
// Need to add full definitions for these based on MoviePage
interface ReviewStats {
  /* ... */
}
interface UserReviewState {
  /* ... */
}
interface AllReviewsState {
  /* ... */
}

// Make sure to fill in the loading/error/mapping logic copied from MoviePage
