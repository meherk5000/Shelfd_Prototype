"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { getBookDetails } from "@/lib/api";
import { MediaActions } from "@/components/media-actions";
import { ShelfButton } from "@/components/shelf-button";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";

interface BookDetailsData {
  id: string;
  title: string;
  author: string;
  description: string;
  rating?: number;
  tags: string[];
  image_url?: string;
  publishedDate?: string;
  pageCount?: number;
  language?: string;
  previewLink?: string;
}

const tabs = ["About", "Reviews & Rating", "Similar Books"];

export function BookDetails({ id }: { id: string }) {
  const [book, setBook] = useState<BookDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("About");
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchBookDetails() {
      try {
        const data = await getBookDetails(id);
        setBook(data);
      } catch (err) {
        console.error("Error fetching book:", err);
        setError("Failed to load book details");
      } finally {
        setLoading(false);
      }
    }

    fetchBookDetails();
  }, [id]);

  const handleWantToRead = () => {
    if (!isAuthenticated) {
      // When trying to add to shelf, redirect to sign in with return URL
      const returnUrl = encodeURIComponent(`/books/${id}`);
      router.push(`/auth/sign-in?returnUrl=${returnUrl}`);
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || "Book not found"}</p>
      </div>
    );
  }

  return (
    <div className="container py-8 px-6 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Book Cover */}
        <div>
          {book.image_url && (
            <img
              src={book.image_url}
              alt={book.title}
              className="w-full rounded-lg shadow-lg"
            />
          )}
        </div>

        {/* Book Info */}
        <div>
          <MediaHeader
            title={book.title}
            subtitle={`By ${book.author}`}
            rating={book.rating}
            tags={book.tags}
            primaryAction={{
              label: "Want to Read",
              onClick: handleWantToRead,
              component: isAuthenticated ? (
                <ShelfButton
                  mediaType="Books"
                  item={{
                    id: book.id,
                    title: book.title,
                    image_url: book.image_url,
                    creator: book.author,
                  }}
                />
              ) : undefined,
            }}
            secondaryActions={[
              {
                label: "Preview",
                onClick: () =>
                  book.previewLink && window.open(book.previewLink, "_blank"),
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-8">
        <MediaTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === "About" && (
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-2">Overview</h2>
                <p className="text-muted-foreground">{book.description}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {book.publishedDate && (
                    <div>
                      <dt className="font-medium">Published Date</dt>
                      <dd className="text-muted-foreground">
                        {book.publishedDate}
                      </dd>
                    </div>
                  )}
                  {book.pageCount && (
                    <div>
                      <dt className="font-medium">Pages</dt>
                      <dd className="text-muted-foreground">
                        {book.pageCount}
                      </dd>
                    </div>
                  )}
                  {book.language && (
                    <div>
                      <dt className="font-medium">Language</dt>
                      <dd className="text-muted-foreground">
                        {new Intl.DisplayNames(["en"], {
                          type: "language",
                        }).of(book.language)}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
