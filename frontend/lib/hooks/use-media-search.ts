import { useState } from "react";

// Define interfaces for the returned media items
interface BookResult {
  id: string;
  title: string;
  authors?: string[];
  published_date?: string;
  cover_url?: string;
}

interface MovieResult {
  id: string;
  title: string;
  director?: string;
  release_date?: string;
  poster_url?: string;
}

interface TvShowResult {
  id: string;
  title: string;
  first_air_date?: string;
  poster_url?: string;
}

export interface MediaSearchResult {
  id: string;
  title: string;
  year?: string;
  cover?: string;
  authors?: string[];
  director?: string;
  media_type: string;
}

export function useMediaSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MediaSearchResult[]>([]);

  const searchMedia = async (query: string, mediaType: string = "all") => {
    if (!query) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the existing media/search endpoint
      const response = await fetch(
        `/api/media/search?q=${encodeURIComponent(query)}&media_type=${mediaType}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.detail || "Search failed");
        setResults([]);
        return;
      }
      
      // Transform the API response to our MediaSearchResult format
      let searchResults: MediaSearchResult[] = [];
      
      if (mediaType === "book" || mediaType === "all") {
        const books = data.books || [];
        const bookResults = books.map((book: BookResult) => ({
          id: book.id,
          title: book.title,
          authors: book.authors,
          year: book.published_date,
          cover: book.cover_url,
          media_type: "book"
        }));
        searchResults = [...searchResults, ...bookResults];
      }
      
      if (mediaType === "movie" || mediaType === "all") {
        const movies = data.movies || [];
        const movieResults = movies.map((movie: MovieResult) => ({
          id: movie.id,
          title: movie.title,
          director: movie.director,
          year: movie.release_date,
          cover: movie.poster_url,
          media_type: "movie"
        }));
        searchResults = [...searchResults, ...movieResults];
      }
      
      if (mediaType === "tv" || mediaType === "all") {
        const tvShows = data.tv_shows || [];
        const tvResults = tvShows.map((show: TvShowResult) => ({
          id: show.id,
          title: show.title,
          year: show.first_air_date,
          cover: show.poster_url,
          media_type: "tv"
        }));
        searchResults = [...searchResults, ...tvResults];
      }
      
      setResults(searchResults);
    } catch (err) {
      console.error("Error searching media:", err);
      setError("Failed to search for media");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    results,
    searchMedia
  };
} 