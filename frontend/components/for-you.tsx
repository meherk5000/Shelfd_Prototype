"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/utils/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MediaItem {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  mediaType: string;
  similarity_score?: number;
}

export default function ForYou() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      try {
        const response = await fetchWithAuth("/api/recommendations");
        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError("Could not load recommendations");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  const handleMediaClick = (item: MediaItem) => {
    const mediaType = item.mediaType;

    if (mediaType === "movie") {
      router.push(`/movies/${item.id}`);
    } else if (mediaType === "tv") {
      router.push(`/tv/${item.id}`);
    } else if (mediaType === "book") {
      router.push(`/books/${item.id}`);
    }
  };

  // Group recommendations by media type
  const groupedRecommendations = recommendations.reduce((acc, item) => {
    const { mediaType } = item;
    if (!acc[mediaType]) {
      acc[mediaType] = [];
    }
    acc[mediaType].push(item);
    return acc;
  }, {} as Record<string, MediaItem[]>);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-2">For You</h1>
        <p className="text-muted-foreground mb-8">
          Powered by AI content-based recommendations
        </p>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-[200px] w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-3 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-2">For You</h1>
        <p className="text-muted-foreground mb-8">
          Powered by AI content-based recommendations
        </p>
        <div className="bg-red-50 p-4 rounded-md text-red-500">{error}</div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-2">For You</h1>
        <p className="text-muted-foreground mb-8">
          Powered by AI content-based recommendations
        </p>
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No recommendations yet</h2>
          <p className="text-muted-foreground mb-4">
            Add more items to your shelves to get personalized AI
            recommendations.
          </p>
          <Button onClick={() => router.push("/explore")}>
            Explore Content
          </Button>
        </div>
      </div>
    );
  }

  const renderMediaSection = (title: string, items: MediaItem[]) => {
    const mediaType = items[0]?.mediaType || title.split(" ")[0].toLowerCase(); // Infer media type for message
    const typeName =
      mediaType === "tv"
        ? "TV shows"
        : mediaType === "movie"
        ? "movies"
        : "books";

    return (
      <div className="my-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => (
              <div
                key={`${item.mediaType}-${item.id}`}
                className="border rounded-lg overflow-hidden relative cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleMediaClick(item)}
              >
                <div className="relative w-full aspect-[2/3]">
                  <Image
                    src={item.image_url || "/placeholder.png"}
                    alt={item.title}
                    layout="fill"
                    objectFit="cover"
                    className="bg-gray-200"
                  />
                  <Badge variant="secondary" className="absolute top-2 left-2">
                    {item.mediaType === "movie"
                      ? "Movie"
                      : item.mediaType === "tv"
                      ? "TV Show"
                      : "Book"}
                  </Badge>
                  {item.similarity_score && (
                    <Badge
                      variant="destructive"
                      className="absolute bottom-2 right-2"
                    >
                      {`${Math.round(item.similarity_score * 100)}% match`}
                    </Badge>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="font-semibold text-sm truncate">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground bg-muted/30 p-6 rounded-lg">
            <p>
              Add more {typeName} to your shelves to get recommendations here.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-2">For You</h1>
      <p className="text-muted-foreground mb-8">
        Powered by AI content-based recommendations
      </p>

      {Object.keys(groupedRecommendations).map((mediaType) => {
        const items = groupedRecommendations[mediaType];
        const title =
          mediaType === "book"
            ? "Books You Might Like"
            : mediaType === "movie"
            ? "Movies You Might Like"
            : "TV Shows You Might Like";

        return <div key={mediaType}>{renderMediaSection(title, items)}</div>;
      })}
    </div>
  );
}
