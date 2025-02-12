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

  const getResultsCount = () => {
    if (!results) return 0;
    const movieCount = results.movies?.results?.length || 0;
    const tvCount = results.tv_shows?.results?.length || 0;
    const bookCount = results.books?.items?.length || 0;
    return movieCount + tvCount + bookCount;
  };

  const fetchResults = async (query: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/media/search/quick`,
        {
          params: { query },
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("[Quick Search] Response:", response.data);
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
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="space-y-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category.toLowerCase()}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {genres.map((genre) => (
            <Button key={genre} variant="outline" size="sm">
              {genre}
            </Button>
          ))}
        </div>

        {results && (
          <div className="space-y-4">
            {results.movies?.results?.map((movie: any) => (
              <div key={movie.id} className="p-4 border rounded-lg">
                <h3>{movie.title}</h3>
                <p>{movie.overview}</p>
              </div>
            ))}

            {results.tv_shows?.results?.map((show: any) => (
              <div key={show.id} className="p-4 border rounded-lg">
                <h3>{show.name}</h3>
                <p>{show.overview}</p>
              </div>
            ))}

            {results.books?.items?.map((book: any) => (
              <div key={book.id} className="p-4 border rounded-lg">
                <h3>{book.volumeInfo.title}</h3>
                <p>{book.volumeInfo.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
