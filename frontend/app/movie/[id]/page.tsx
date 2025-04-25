"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getMovieDetails } from "@/lib/api";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import ReviewForm from "@/components/reviews/ReviewForm";
import AggregateRatingDisplay from "@/components/reviews/AggregateRatingDisplay";
import ReviewList from "@/components/reviews/ReviewList";
import { getUserReview, getMediaReviews } from "@/services/reviewService";
import { useUser } from "@auth0/nextjs-auth0/client";
import { ReviewItemData } from "@/components/reviews/ReviewItem";
import { Skeleton } from "@/components/ui/skeleton";
import { ShelfButton } from "@/components/shelf-button";

const tabs = [
  "About",
  "Reviews & Rating",
  "People you follow",
  "Posts",
  "Clubs",
  "Content Warnings",
];

interface MovieData {
  id: number;
  title: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  genres: { id: number; name: string }[];
  vote_average: number;
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string;
    }[];
    crew: {
      id: number;
      name: string;
      job: string;
      department: string;
    }[];
  };
}

// Define type for user's review state
interface UserReviewState {
  review?: ReviewItemData | null; // null if no review, undefined if loading
  isLoading: boolean;
  error: string | null;
}

// Define type for all reviews state
interface AllReviewsState {
  reviews: ReviewItemData[];
  stats: ReviewStats | null;
  isLoading: boolean;
  error: string | null;
}

// Define ReviewStats locally based on expected API response
interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: { [key: string]: number }; // e.g., { "1.0": 5, "1.5": 2, ... }
}

export default function MoviePage() {
  const [activeTab, setActiveTab] = useState("About");
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const params = useParams();
  const movieId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isLoading: authLoading } = useUser(); // Auth0 user hook

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
    const fetchMovie = async () => {
      setLoading(true);
      setError(false);
      try {
        if (movieId) {
          console.log("Fetching movie with ID:", movieId);
          const data = await getMovieDetails(Number(movieId));
          setMovie(data);
        } else {
          throw new Error("Movie ID is undefined");
        }
      } catch (err) {
        console.error("Error fetching movie:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchMovie();
    }
  }, [movieId]);

  // Function to fetch all review data (user's and all)
  const fetchReviewData = async () => {
    if (!movieId || !movie) return;

    setUserReviewState((prev) => ({ ...prev, isLoading: true, error: null }));
    setAllReviewsState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      let userReview = null;
      // Fetch user's review only if logged in and user.sub exists
      if (user && user.sub) {
        try {
          const userReviewRes = await getUserReview("movie", movieId);
          if (userReviewRes.exists && user.sub) {
            // Map backend response to ReviewItemData if needed
            userReview = {
              id: userReviewRes.review.id,
              user_id: user.sub, // Now guaranteed to be string
              username: user.nickname || user.name || "You",
              user_avatar: user.picture || null,
              rating: userReviewRes.review.rating,
              review_text: userReviewRes.review.review_text,
              created_at: userReviewRes.review.created_at,
              updated_at: userReviewRes.review.updated_at,
              likes_count: 0,
              has_liked: false,
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
          // Don't block main reviews if this fails, just show error for user review section
          setUserReviewState({
            review: undefined,
            isLoading: false,
            error: "Could not load your review.",
          });
        }
      } else {
        setUserReviewState({ review: null, isLoading: false, error: null }); // Not logged in or no sub, no review
      }

      // Fetch all reviews and stats
      const allReviewsRes = await getMediaReviews("movie", movieId);
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
      // Ensure user review loading is also false if main fetch fails after user fetch succeeded
      if (userReviewState.isLoading) {
        setUserReviewState((prev) => ({ ...prev, isLoading: false }));
      }
    }
  };

  useEffect(() => {
    // Fetch movie details (existing logic)
    const fetchMovie = async () => {
      /* ... existing fetchMovie logic ... */
    };
    if (movieId) {
      fetchMovie();
    }

    // Fetch review data once movie data is loaded
    if (!loading && movie) {
      fetchReviewData();
    }
    // Dependency array includes user to refetch if login state changes
  }, [movieId, loading, movie, user]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !movie) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl">
          <p>Movie not found or an error occurred</p>
        </div>
      </Layout>
    );
  }

  // Format the release year
  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "";

  // Get director name from crew
  const director =
    movie.credits?.crew?.find((person) => person.job === "Director")?.name ||
    "";

  // Format subtitle with year and director
  const subtitle = `${releaseYear}${
    director ? ` | Directed By ${director}` : ""
  }`;

  // Format genres as tags
  const tags = movie.genres?.map((genre) => genre.name) || [];

  const handleReviewSubmitSuccess = () => {
    // Refetch all review data to show the updated/new review and stats
    fetchReviewData();
  };

  // Create the primary action component (ShelfButton)
  const shelfButtonItem = {
    id: String(movie.id), // Ensure ID is string
    title: movie.title,
    image_url: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : undefined,
    creator: director, // Add the director here
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <div>
            {movie.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
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
          <div>
            <MediaHeader
              title={movie.title}
              subtitle={subtitle}
              rating={movie.vote_average / 2}
              tags={tags}
              primaryAction={{
                label: "Want To Watch", // Fallback label, button component overrides
                onClick: () => {}, // No-op, button handles its own logic
                component: (
                  <ShelfButton
                    mediaType="Movies"
                    item={shelfButtonItem}
                    // onShelfUpdated={optionalCallback}
                  />
                ),
              }}
              secondaryActions={[
                {
                  label: "Where to Watch",
                  onClick: () => {},
                },
                {
                  label: "Trailer",
                  onClick: () => {},
                },
              ]}
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
                    {movie.overview || "No overview available."}
                  </p>
                </section>

                {movie.credits?.cast && movie.credits.cast.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold mb-2">Cast</h2>
                    <div className="space-y-2">
                      <ul className="space-y-1 text-muted-foreground">
                        {movie.credits.cast.slice(0, 10).map((actor) => (
                          <li key={actor.id}>
                            {actor.name} as {actor.character}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
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

                {/* User Review Form (Show if logged in) */}
                {user && (
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Your Review</h2>
                    {userReviewState.isLoading && (
                      <Skeleton className="h-40 w-full" /> // Placeholder for form
                    )}
                    {!userReviewState.isLoading && (
                      <ReviewForm
                        mediaId={movieId!}
                        mediaType="movie"
                        // Pass existing review data if it exists
                        initialRating={userReviewState.review?.rating || 0}
                        initialReviewText={
                          userReviewState.review?.review_text || ""
                        }
                        reviewId={userReviewState.review?.id}
                        onSubmitSuccess={handleReviewSubmitSuccess}
                        // Need to pass movie title/image for legacy endpoint
                        // movieTitle={movie.title}
                        // movieImageUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined}
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
                    mediaId={movieId!}
                    mediaType="movie"
                    currentUserId={user?.sub ?? undefined} // Pass undefined explicitly if user.sub is null/undefined
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
