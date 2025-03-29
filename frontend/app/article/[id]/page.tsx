"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getArticleDetails } from "@/lib/api";
import { ShelfButton } from "@/components/shelf-button";
import { useAuth } from "@/lib/context/AuthContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const tabs = [
  "About",
  "People you follow",
  "Posts",
  "Clubs",
  "Content Warnings",
];

interface ArticleData {
  id: string;
  title: string;
  author: string;
  source: string;
  image_url: string;
  publication_date: string;
  content: string;
  description: string;
  url: string;
  tags: string[];
  type: string;
  read_time?: string; // Estimated read time (e.g. "5 min read")
}

// Fallback data for when article fetch fails
const fallbackArticle: ArticleData = {
  id: "",
  title: "Is there ever such thing as a 'preventative facelift'?",
  author: "Laura Pitcher",
  source: "Sample Source",
  image_url: "https://i.imgur.com/7YfWWmb.jpg",
  publication_date: "2025-01-24T00:00:00Z",
  content:
    "People in their 20s and 30s are getting their faces 'lifted into oblivion' in the latest iteration of the 'preventative' ageing trap.",
  description:
    "People in their 20s and 30s are getting their faces 'lifted into oblivion' in the latest iteration of the 'preventative' ageing trap.",
  url: "#",
  tags: ["Beauty", "Health"],
  type: "article",
  read_time: "4 min read",
};

export default function ArticlePage() {
  const [activeTab, setActiveTab] = useState("About");
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const params = useParams();
  const articleId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(false);
      try {
        if (articleId) {
          console.log("Fetching article with ID:", articleId);
          const data = await getArticleDetails(articleId);

          // Add read time calculation if not provided by the API
          if (!data.read_time && data.content) {
            const wordCount = data.content
              .replace(/<[^>]*>/g, "")
              .trim()
              .split(/\s+/).length;
            const readTimeMin = Math.max(1, Math.round(wordCount / 200)); // Assuming average reading speed of 200 words per minute
            data.read_time = `${readTimeMin} min read`;
          }

          setArticle(data);
        } else {
          throw new Error("Article ID is undefined");
        }
      } catch (error) {
        console.error("Error fetching article:", error);
        setError(true);
        // Use fallback data when the API call fails
        setArticle(fallbackArticle);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl">
          <p>Article not found</p>
        </div>
      </Layout>
    );
  }

  // Use article tags or default to "Article" if none exist
  const displayTags =
    article.tags && article.tags.length > 0 ? article.tags : ["Article"];

  return (
    <Layout>
      <div className="container mx-auto py-6 sm:py-8 px-4 md:px-8 lg:px-12 max-w-6xl">
        <div className="space-y-6 sm:space-y-8">
          {article.image_url ? (
            <div className="relative w-full max-h-[400px] h-[300px]">
              <Image
                src={article.image_url}
                alt={article.title}
                fill
                className="rounded-lg object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority
              />
            </div>
          ) : (
            <div className="w-full rounded-lg bg-gray-200 h-[300px] flex items-center justify-center">
              <p className="text-gray-500">No image available</p>
            </div>
          )}

          <div>
            <MediaHeader
              title={article.title}
              subtitle={`By ${article.author || "Unknown"} | ${
                article.source
              } | ${formatDate(article.publication_date)}${
                article.read_time ? ` | ${article.read_time}` : ""
              }`}
              tags={displayTags}
              primaryAction={{
                label: "Save",
                onClick: () => {},
                component: isAuthenticated ? (
                  <ShelfButton
                    mediaType="Articles"
                    item={{
                      id: article.id,
                      title: article.title,
                      image_url: article.image_url,
                      creator: article.author,
                    }}
                  />
                ) : (
                  <Button
                    onClick={() => (window.location.href = "/auth/sign-in")}
                  >
                    Save
                  </Button>
                ),
              }}
              secondaryActions={[
                {
                  label: "Read Full Article",
                  onClick: () =>
                    article.url && article.url !== "#"
                      ? window.open(article.url, "_blank")
                      : null,
                },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <MediaTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="mt-4 sm:mt-6">
            {activeTab === "About" && (
              <div className="space-y-4 sm:space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-2">Overview</h2>
                  <div className="space-y-2">
                    {article.read_time && (
                      <div className="text-sm font-medium inline-flex items-center rounded-md bg-muted px-2 py-1">
                        <span className="text-muted-foreground">
                          {article.read_time}
                        </span>
                      </div>
                    )}
                    <p className="text-muted-foreground">
                      {article.description || "No description available."}
                    </p>
                  </div>
                </section>

                {article.url && article.url !== "#" && (
                  <section>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline block mt-4"
                    >
                      Read the full article on {article.source}
                    </a>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
