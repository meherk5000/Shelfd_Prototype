"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getMovieDetails } from "@/lib/api";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

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

export default function MoviePage() {
  const [activeTab, setActiveTab] = useState("About");
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const params = useParams();
  const movieId = Array.isArray(params.id) ? params.id[0] : params.id;

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
              rating={movie.vote_average / 2} // Convert from 10-point to 5-point scale
              tags={tags}
              primaryAction={{
                label: "Want To Watch",
                onClick: () => {},
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
