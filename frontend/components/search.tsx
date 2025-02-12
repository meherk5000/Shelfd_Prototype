"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { searchMedia } from "@/lib/api";
import { useRouter } from "next/navigation";
import { API_ROUTES } from "@/lib/config";
import axios from "axios";

const categories = ["All", "Books", "Movies", "TV Shows"];
const genres = ["New Releases", "Fantasy & Sci-Fi"];

export function Search() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Add this function to check what results we have
  const getResultsCount = () => {
    if (!results) return 0;
    const movieCount = results.movies?.results?.length || 0;
    const tvCount = results.tv_shows?.results?.length || 0;
    const bookCount = results.books?.items?.length || 0;
    return movieCount + tvCount + bookCount;
  };

  const fetchResults = async (query: string) => {
    try {
      const response = await axios.get(API_ROUTES.SEARCH, {
        params: { query },
      });
      return response.data;
    } catch (error) {
      console.error("[Quick Search] Error:", error);
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Explore</h1>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <Button key={genre} variant="outline" size="sm">
            {genre}
          </Button>
        ))}
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Debug info */}
      <div className="text-sm text-muted-foreground">
        {loading ? "Loading..." : `Found ${getResultsCount()} results`}
      </div>

      {/* Results Grid */}
      {results && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Movies */}
          {results.movies?.results?.map((movie: any) => (
            <div
              key={`movie-${movie.id}`}
              className="bg-card border rounded-lg overflow-hidden"
            >
              {movie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="aspect-[2/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[2/3] bg-muted" />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{movie.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(movie.release_date).getFullYear()}
                </p>
              </div>
            </div>
          ))}

          {/* TV Shows */}
          {results.tv_shows?.results?.map((show: any) => (
            <div
              key={`tv-${show.id}`}
              className="bg-card border rounded-lg overflow-hidden cursor-pointer"
              onClick={() => {
                const tvShowId = show.id;
                console.log("[Search] Clicking TV show:", {
                  id: tvShowId,
                  name: show.name,
                  show,
                });
                router.push(`/tv/${tvShowId}`);
              }}
            >
              {show.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                  alt={show.name}
                  className="aspect-[2/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[2/3] bg-muted" />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{show.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {show.first_air_date
                    ? new Date(show.first_air_date).getFullYear()
                    : "N/A"}
                </p>
              </div>
            </div>
          ))}

          {/* Books */}
          {results.books?.items?.map((book: any) => (
            <div
              key={`book-${book.id}`}
              className="bg-card border rounded-lg overflow-hidden"
            >
              {book.volumeInfo.imageLinks?.thumbnail ? (
                <img
                  src={book.volumeInfo.imageLinks.thumbnail}
                  alt={book.volumeInfo.title}
                  className="aspect-[2/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[2/3] bg-muted" />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">
                  {book.volumeInfo.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {book.volumeInfo.authors?.join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show placeholder cards when there are no results */}
      {!results && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="bg-card border rounded-lg overflow-hidden"
            >
              <div className="aspect-[2/3] bg-muted" />
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">Item Title</h3>
                <p className="text-sm text-muted-foreground">
                  Item description
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
