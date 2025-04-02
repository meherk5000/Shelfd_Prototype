// app/tv/[id]/page.tsx
import { TVShowDetails } from "@/components/tv/tv-show-details";
import { Layout } from "@/components/layout";

export default function TVShowPage({ params }: { params: { id: string } }) {
  return (
    <Layout>
      <TVShowDetails id={parseInt(params.id)} />
    </Layout>
  );
}
