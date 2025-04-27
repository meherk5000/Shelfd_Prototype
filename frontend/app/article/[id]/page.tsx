"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getArticleDetails } from "@/lib/api";
import { ArticleDetails } from "@/components/articles/article-details";

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
  read_time?: string;
}

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
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const params = useParams();
  const articleId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(false);
      try {
        if (articleId) {
          console.log("Fetching article with ID:", articleId);
          const data = await getArticleDetails(articleId);

          if (!data.read_time && data.content) {
            const wordCount = data.content
              .replace(/<[^>]*>/g, "")
              .trim()
              .split(/\s+/).length;
            const readTimeMin = Math.max(1, Math.round(wordCount / 200));
            data.read_time = `${readTimeMin} min read`;
          }

          setArticle(data);
        } else {
          throw new Error("Article ID is undefined");
        }
      } catch (error) {
        console.error("Error fetching article:", error);
        setError(true);
        setArticle(fallbackArticle);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error && article?.id === "") {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl">
          <p>Error loading article details.</p>
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 md:px-8 lg:px-12 max-w-6xl">
          <p>Article not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 sm:py-8 px-4 md:px-8 lg:px-12 max-w-6xl">
        <ArticleDetails article={article} />
      </div>
    </Layout>
  );
}
