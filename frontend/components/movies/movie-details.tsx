"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getMovieDetails } from "@/lib/api";

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
}

const tabs = ["About", "Cast & Crew", "Reviews", "Similar Movies"];

export function MovieDetails({ id }: { id: number }) {
  const [movie, setMovie] = useState<MovieDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("About");

  useEffect(() => {
    async function fetchMovieDetails() {
      try {
        const data = await getMovieDetails(id);
        setMovie(data);
      } catch (err) {
        console.error("Error fetching movie:", err);
        setError("Failed to load movie details");
      } finally {
        setLoading(false);
      }
    }

    fetchMovieDetails();
  }, [id]);

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

  return (
    <div className="container py-8 px-6 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Movie Poster */}
        <div>
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        {/* Movie Info */}
        <div>
          <MediaHeader
            title={movie.title}
            subtitle={`Released: ${new Date(movie.release_date).getFullYear()}`}
            rating={movie.vote_average}
            tags={movie.genres.map((g) => g.name)}
            primaryAction={{
              label: "Want to Watch",
              onClick: () => {}, // Implement watchlist functionality
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
        </div>
      </div>
    </div>
  );
}
