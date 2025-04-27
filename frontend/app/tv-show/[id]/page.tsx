"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Layout } from "@/components/layout";
// Remove imports for components/hooks handled by TVShowDetails
// import { MediaHeader } from "@/components/media/media-header";
// import { MediaTabs } from "@/components/media/media-tabs";
// import { getTVDetails } from "@/lib/api";
// import { Loader2 } from "lucide-react";
// import Image from "next/image";
// import { Skeleton } from "@/components/ui/skeleton";
// import { ShelfButton } from "@/components/shelf-button";
// import { useUser } from "@auth0/nextjs-auth0/client";

// Remove Review Components/Service imports - handled by TVShowDetails
// import ReviewForm from "@/components/reviews/ReviewForm";
// import AggregateRatingDisplay from "@/components/reviews/AggregateRatingDisplay";
// import ReviewList from "@/components/reviews/ReviewList";
// import { getUserReview, getMediaReviews } from "@/services/reviewService";
// import { ReviewItemData } from "@/components/reviews/ReviewItem";

// Import the main details component
import { TVShowDetails } from "@/components/tv/tv-show-details";

// Remove local interface definitions - handled by TVShowDetails
// interface TVShowData { ... }
// interface ReviewStats { ... }
// interface UserReviewState { ... }
// interface AllReviewsState { ... }

// Remove tabs definition - handled by TVShowDetails
// const tabs = [ ... ];

export default function TVShowPage() {
  const params = useParams();
  const tvShowId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Basic loading/error state for ID checking
  const [loadingId, setLoadingId] = useState(true);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [numericId, setNumericId] = useState<number | null>(null);

  useEffect(() => {
    if (tvShowId) {
      const idNum = Number(tvShowId);
      if (!isNaN(idNum)) {
        setNumericId(idNum);
        setErrorId(null);
      } else {
        setErrorId("Invalid TV Show ID provided in URL.");
      }
    } else {
      setErrorId("No TV Show ID found in URL.");
    }
    setLoadingId(false);
  }, [tvShowId]);

  // Remove all the state and useEffects related to fetching show/review data
  // const [activeTab, setActiveTab] = useState("About");
  // const [tvShow, setTvShow] = useState<TVShowData | null>(null);
  // ... and so on ...

  if (loadingId) {
    // Optional: can add a minimal loading spinner here if ID parsing is slow
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  if (errorId || numericId === null) {
    return (
      <Layout>
        <div>Error: {errorId || "Invalid TV Show ID"}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Render the TVShowDetails component, passing the validated numeric ID */}
      <TVShowDetails id={numericId} />
    </Layout>
  );
}

// Remove helper functions/interfaces if they were defined at the bottom
