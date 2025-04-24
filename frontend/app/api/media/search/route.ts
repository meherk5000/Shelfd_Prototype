import { NextResponse } from "next/server";
import { TMDB_API_KEY } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const mediaType = searchParams.get("media_type");

  if (!query || !mediaType) {
    return NextResponse.json(
      { error: "Missing query or media type" },
      { status: 400 }
    );
  }

  try {
    if (mediaType === "movie") {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          query
        )}&language=en-US&page=1`
      );
      const data = await response.json();
      
      const movies = data.results.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        director: "Unknown Director", // TMDB doesn't provide director in search results
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
        release_date: movie.release_date,
        overview: movie.overview,
      }));

      return NextResponse.json({ movies });
    } else if (mediaType === "tv") {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          query
        )}&language=en-US&page=1`
      );
      const data = await response.json();

      const tv_shows = data.results.map((show: any) => ({
        id: show.id,
        title: show.name,
        creator: "Unknown Creator", // TMDB doesn't provide creator in search results
        poster_url: show.poster_path
          ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
          : null,
        first_air_date: show.first_air_date,
        overview: show.overview,
      }));

      return NextResponse.json({ tv_shows });
    } else if (mediaType === "book") {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      const books = data.items?.map((book: any) => ({
        id: book.id,
        title: book.volumeInfo.title,
        authors: book.volumeInfo.authors || ["Unknown Author"],
        cover_url: book.volumeInfo.imageLinks?.thumbnail || null,
        published_date: book.volumeInfo.publishedDate,
        description: book.volumeInfo.description,
      })) || [];

      return NextResponse.json({ books });
    }

    return NextResponse.json(
      { error: "Invalid media type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error searching media:", error);
    return NextResponse.json(
      { error: "Failed to search media" },
      { status: 500 }
    );
  }
} 