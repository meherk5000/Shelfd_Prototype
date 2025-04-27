"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
// Remove imports handled by MovieDetails
// import { MediaHeader } from "@/components/media/media-header";
// import { MediaTabs } from "@/components/media/media-tabs";
// import { getMovieDetails } from "@/lib/api";
import { useParams } from "next/navigation";
// import { Loader2 } from "lucide-react";
// import Image from "next/image";
// import ReviewForm from "@/components/reviews/ReviewForm";
// import AggregateRatingDisplay from "@/components/reviews/AggregateRatingDisplay";
// import ReviewList from "@/components/reviews/ReviewList";
// import { getUserReview, getMediaReviews } from "@/services/reviewService";
// import { useUser } from "@auth0/nextjs-auth0/client";
// import { ReviewItemData } from "@/components/reviews/ReviewItem";
// import { Skeleton } from "@/components/ui/skeleton";
// import { ShelfButton } from "@/components/shelf-button";

// Import the main details component
import { MovieDetails } from "@/components/movies/movie-details";

// Remove local definitions - handled by MovieDetails
// const tabs = [ ... ];
// interface MovieData { ... }
// interface UserReviewState { ... }
// interface AllReviewsState { ... }
// interface ReviewStats { ... }

export default function MoviePage() {
  const params = useParams();
  const movieId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Basic loading/error state for ID checking
  const [loadingId, setLoadingId] = useState(true);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [numericId, setNumericId] = useState<number | null>(null);

  useEffect(() => {
    if (movieId) {
      const idNum = Number(movieId);
      if (!isNaN(idNum)) {
        setNumericId(idNum);
        setErrorId(null);
      } else {
        setErrorId("Invalid Movie ID provided in URL.");
      }
    } else {
      setErrorId("No Movie ID found in URL.");
    }
    setLoadingId(false);
  }, [movieId]);

  // Remove internal state and fetching logic
  // const [activeTab, setActiveTab] = useState("About");
  // ... etc ...

  if (loadingId) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  if (errorId || numericId === null) {
    return (
      <Layout>
        <div>Error: {errorId || "Invalid Movie ID"}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Render the MovieDetails component */}
      <MovieDetails id={numericId} />
    </Layout>
  );
}
