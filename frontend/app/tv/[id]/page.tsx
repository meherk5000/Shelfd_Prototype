// app/tv/[id]/page.tsx
import { Suspense } from "react";
import { use } from "react";
import { TVShowDetails } from "@/components/tv/tv-show-details";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

export default function TVShowPage({ params }: { params: { id: string } }) {
  // Unwrap params using use()
  const { id: rawId } = use(Promise.resolve(params));

  // Parse the ID (handle potential errors)
  let tvId: number | null = null;
  try {
    tvId = parseInt(rawId);
    if (isNaN(tvId)) throw new Error("Parsed ID is NaN");
  } catch (error) {
    console.error("TV Page - Failed to parse ID:", rawId, error);
    return <div>Invalid TV Show ID format</div>;
  }

  return (
    <Layout>
      {/* Use Suspense like in BookPage if TVShowDetails supports it */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <TVShowDetails id={tvId} />
      </Suspense>
    </Layout>
  );
}
