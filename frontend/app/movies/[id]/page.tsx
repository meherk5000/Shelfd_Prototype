import { Suspense } from "react";
import { use } from "react";
import { MovieDetails } from "@/components/movies/movie-details";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

export default function MoviePage({ params }: { params: { id: string } }) {
  const { id: rawId } = use(Promise.resolve(params));

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
