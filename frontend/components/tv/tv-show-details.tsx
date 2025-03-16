"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getTVDetails } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShelfButton } from "@/components/shelf-button";

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

const tabs = ["About", "Episodes", "Cast & Crew", "Reviews", "Similar Shows"];

export function TVShowDetails({ id }: { id: number }) {
  const [show, setShow] = useState<TVShowDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("About");
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchTVDetails() {
      try {
        const data = await getTVDetails(id);
        setShow(data);
      } catch (err) {
        console.error("Error fetching TV show:", err);
        setError("Failed to load TV show details");
      } finally {
        setLoading(false);
      }
    }

    fetchTVDetails();
  }, [id]);

  const handleWantToWatch = () => {
    if (!isAuthenticated) {
      // When trying to add to shelf, redirect to sign in with return URL
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
            tags={show.genres.map((g) => g.name)}
            primaryAction={{
              label: "Want to Watch",
              onClick: handleWantToWatch,
              component: isAuthenticated ? (
                <ShelfButton
                  mediaType="TV Shows"
                  item={{
                    id: show.id.toString(),
                    title: show.name,
                    image_url: show.poster_path
                      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                      : undefined,
                  }}
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
        </div>
      </div>
    </div>
  );
}
