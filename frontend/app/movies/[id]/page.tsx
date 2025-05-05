import { Suspense } from "react";
import { MovieDetails } from "@/components/movies/movie-details";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

interface MoviePageProps {
  params: {
    id: string;
  };
}

export default function MoviePage({ params }: MoviePageProps) {
  const { id: rawId } = params;

  let movieId: number | null = null;
  try {
    movieId = parseInt(rawId);
    if (isNaN(movieId)) throw new Error("Parsed ID is NaN");
  } catch (error) {
    console.error("Movie Page - Failed to parse ID:", rawId, error);
    return <div>Invalid Movie ID format</div>;
  }

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <MovieDetails id={movieId} />
      </Suspense>
    </Layout>
  );
}
