import { Suspense } from "react";
import { BookDetails } from "@/components/books/book-details";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

interface BookPageProps {
  params: {
    id: string;
  };
}

export default function BookPage({ params }: BookPageProps) {
  const { id } = params;
  console.log("Book page ID:", id);

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
