"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MediaHeader } from "@/components/media/media-header";
import { MediaTabs } from "@/components/media/media-tabs";
import { ShelfButton } from "@/components/shelf-button";
import { useAuth } from "@/lib/context/AuthContext";
import { Button } from "@/components/ui/button";

// Define the structure for the article data expected by this component
interface ArticleData {
  id: string;
  title: string;
  author: string;
  source: string;
  image_url: string;
  publication_date: string;
  content: string; // Keep content for potential future use (e.g., snippets)
  description: string;
  url: string;
  tags: string[];
  type: string;
  read_time?: string;
}

interface ArticleDetailsProps {
  article: ArticleData;
}

// Helper function to format date (copied from original page)
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

// Dummy tabs data (can be adjusted or made dynamic later if needed)
const tabs = [
  "About",
  "People you follow",
  "Posts",
  "Clubs",
  "Content Warnings",
];

export function ArticleDetails({ article }: ArticleDetailsProps) {
  const [activeTab, setActiveTab] = useState("About");
  const { isAuthenticated } = useAuth();

  // Use article tags or default to "Article" if none exist
  const displayTags =
    article.tags && article.tags.length > 0 ? article.tags : ["Article"];

  return (
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
                mediaType="Articles" // Ensure correct mediaType string
                item={{
                  id: article.id,
                  title: article.title,
                  image_url: article.image_url,
                  creator: article.author,
                }}
              />
            ) : (
              <Button onClick={() => (window.location.href = "/auth/sign-in")}>
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

      <div className="mt-6 sm:mt-8">
        <MediaTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

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
          {/* Placeholder for other tabs */}
          {activeTab !== "About" && (
            <div>Content for {activeTab} will go here.</div>
          )}
        </div>
      </div>
    </div>
  );
}
