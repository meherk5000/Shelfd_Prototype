import { Suspense } from "react";
import { use } from "react";
import { BookDetails } from "@/components/books/book-details";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

export default function BookPage({ params }: { params: { id: string } }) {
  // Unwrap params using use()
  const { id } = use(Promise.resolve(params));
  console.log("Book page ID:", id); // Add this log

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <BookDetails id={id} />
      </Suspense>
    </Layout>
  );
}
