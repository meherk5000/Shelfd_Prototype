import { useState } from "react";
import { api } from '@/lib/api'; // Import api instance
import axios from 'axios'; // Import for error checking

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
    if (!query) {
        setResults([]); // Clear results if query is empty
        return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use api instance with params option
      const response = await api.get(
        `/api/media/search`, // Relative URL
        {
          params: { q: query, media_type: mediaType }
        }
      );

      const data = response.data; // Axios provides data directly

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
    } catch (err: any) {
      console.error("Error searching media:", err);
      // Try to get detail from Axios error structure
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to search for media");
      setError(message);
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