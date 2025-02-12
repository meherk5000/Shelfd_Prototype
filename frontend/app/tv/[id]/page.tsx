// app/tv/[id]/page.tsx
import { Layout } from "@/components/layout";
import { TVShowDetails } from "@/components/tv/tv-show-details";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function TVShowPage({ params }: { params: { id: string } }) {
  // Simply pass the id directly since this is a server component
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <TVShowDetails id={parseInt(params.id)} />
      </Suspense>
    </Layout>
  );
}
