"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getTrendingMedia, getNewReleases, getCategoryMedia } from "@/lib/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ForYou from "@/components/for-you";

interface MediaItem {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  mediaType: string; // movie, tv, book, article
  overview?: string;
  read_time?: string;
}

// Define categories for the explore page
const CATEGORIES = [
  { id: "fantasy-sci-fi", name: "Fantasy & Sci-Fi" },
  { id: "mystery-thriller", name: "Mystery & Thriller" },
  { id: "romance", name: "Romance" },
  { id: "classics", name: "Classics" },
  { id: "culture-ideas", name: "Culture & Ideas" },
  { id: "drama-romance", name: "Drama & Romance" },
];

export default function Explore() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("for-you");
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [newReleases, setNewReleases] = useState<MediaItem[]>([]);
  const [categoryItems, setCategoryItems] = useState<{
    [key: string]: MediaItem[];
  }>({});
  const [loading, setLoading] = useState(true);

  const fetchTrending = async (tab: string) => {
    const data = await getTrendingMedia(tab);
    return data.results || [];
  };

  const fetchNewReleases = async (tab: string) => {
    const data = await getNewReleases(tab);
    return data.results || [];
  };

  const fetchCategoryItems = async (tab: string) => {
    const categoryData: { [key: string]: MediaItem[] } = {};

    // Only fetch for first two categories to avoid too many requests
    const categoriesToFetch = CATEGORIES.slice(0, 3);

    for (const category of categoriesToFetch) {
      const data = await getCategoryMedia(category.id, tab);
      categoryData[category.id] = data.results || [];
    }

    return categoryData;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // --- Debug Logging ---
      console.log(
        `Explore useEffect: Loading data for activeTab: ${activeTab}`
      );
      // --- End Debug Logging ---
      try {
        // Fetch all data in parallel
        const [trendingData, newReleasesData, categoriesData] =
          await Promise.all([
            fetchTrending(activeTab),
            fetchNewReleases(activeTab),
            fetchCategoryItems(activeTab),
          ]);

        // --- Debug Logging ---
        console.log("Explore useEffect: Data received:");
        console.log("  Trending:", trendingData);
        console.log("  New Releases:", newReleasesData);
        console.log("  Categories:", categoriesData);
        // --- End Debug Logging ---

        setTrending(trendingData);
        setNewReleases(newReleasesData);
        setCategoryItems(categoriesData);
      } catch (error) {
        console.error("Error loading explore data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only load data if the tab is NOT 'for-you'
    if (activeTab !== "for-you") {
      loadData();
    } else {
      // If tab is 'for-you', ensure loading is false as ForYou component handles its own loading
      setLoading(false);
    }
  }, [activeTab]);

  const handleMediaClick = (item: MediaItem) => {
    const mediaType = item.mediaType;

    if (mediaType === "movie") {
      router.push(`/movies/${item.id}`);
    } else if (mediaType === "tv") {
      router.push(`/tv/${item.id}`);
    } else if (mediaType === "book") {
      router.push(`/books/${item.id}`);
    } else if (mediaType === "article") {
      router.push(`/article/${item.id}`);
    }

    console.log(`Navigating to ${mediaType} with ID: ${item.id}`);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Reset data when tab changes
    setTrending([]);
    setNewReleases([]);
    setCategoryItems({});
    setLoading(true);
  };

  const renderMediaSection = (
    title: string,
    items: MediaItem[],
    showSeeAll: boolean = false,
    seeAllLink?: string
  ) => {
    return (
      <div className="my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          {showSeeAll && seeAllLink && (
            <Link href={seeAllLink} className="text-primary hover:underline">
              See all
            </Link>
          )}
        </div>

        {loading ? (
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
        ) : items.length > 0 ? (
          <ScrollArea className="w-full pb-4">
            <div className="flex space-x-4">
              {items.map((item) => (
                <Card
                  key={`${item.mediaType}-${item.id}`}
                  className="min-w-[200px] w-[200px] overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleMediaClick(item)}
                >
                  <div className="relative h-[260px] w-full">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        sizes="200px"
                        className="object-cover"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground">No Image</span>
                      </div>
                    )}
                    {item.mediaType && (
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {item.mediaType === "movie"
                          ? "Movie"
                          : item.mediaType === "tv"
                          ? "TV Show"
                          : item.mediaType === "book"
                          ? "Book"
                          : "Article"}
                      </div>
                    )}
                    {item.read_time && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {item.read_time}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                    {item.subtitle && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {item.subtitle}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              No {title.toLowerCase()} found for this category.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-8">Explore</h1>

      <Tabs defaultValue="for-you" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="for-you">For You</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="tv-shows">TV Shows</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
        </TabsList>

        {activeTab === "for-you" ? (
          <ForYou />
        ) : (
          <div>
            {renderMediaSection(
              "Trending",
              trending,
              true,
              "/explore/trending"
            )}
            {renderMediaSection(
              "New Releases",
              newReleases,
              true,
              "/explore/new-releases"
            )}

            {CATEGORIES.map((category) => (
              <div key={category.id}>
                {renderMediaSection(
                  category.name,
                  categoryItems[category.id] || [],
                  true,
                  `/explore/category/${category.id}`
                )}
              </div>
            ))}
          </div>
        )}
      </Tabs>
    </div>
  );
}
