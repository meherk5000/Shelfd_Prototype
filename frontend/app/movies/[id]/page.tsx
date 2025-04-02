import { MovieDetails } from "@/components/movies/movie-details";
import { Layout } from "@/components/layout";

export default function MoviePage({ params }: { params: { id: string } }) {
  return (
    <Layout>
      <MovieDetails id={parseInt(params.id)} />
    </Layout>
  );
}
