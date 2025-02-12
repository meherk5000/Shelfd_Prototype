import { Suspense } from "react";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";
import { MovieDetails } from "@/components/movies/movie-details";

export default function MoviePage({ params }: { params: { id: string } }) {
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <MovieDetails id={parseInt(params.id)} />
      </Suspense>
    </Layout>
  );
}
