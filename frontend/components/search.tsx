"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Filter, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import axios from "axios";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Updated tabs to include Articles
const tabs = ["All", "Books", "Movies", "TV Shows", "Articles"];
const categories = [
  "Trending Now",
  "New Releases",
  "Culture & Ideas",
  "Fantasy & Sci-Fi",
  "Drama & Romance",
];

export function Search() {
  const [activeTab, setActiveTab] = useState("All");
  const [activeFilter, setActiveFilter] = useState("all");
  const [trending, setTrending] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [categoryItems, setCategoryItems] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch trending items
    const fetchTrending = async () => {
      setLoading(true);
      try {
        // This would be replaced with actual API calls to your backend for each section
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/media/search/quick`,
          {
            params: { query: "popular" },
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Combine all media types for the "All" tab or filter by the active tab
        let items = [];
        if (activeTab === "All") {
          items = [
            ...response.data.movies
              .slice(0, 4)
              .map((item: any) => ({ ...item, mediaType: "movie" })),
            ...response.data.tv_shows
              .slice(0, 4)
              .map((item: any) => ({ ...item, mediaType: "tv" })),
            ...response.data.books
              .slice(0, 4)
              .map((item: any) => ({ ...item, mediaType: "book" })),
            ...response.data.articles
              .slice(0, 4)
              .map((item: any) => ({ ...item, mediaType: "article" })),
          ];
        } else if (activeTab === "Books") {
          items = response.data.books.map((item: any) => ({
            ...item,
            mediaType: "book",
          }));
        } else if (activeTab === "Movies") {
          items = response.data.movies.map((item: any) => ({
            ...item,
            mediaType: "movie",
          }));
        } else if (activeTab === "TV Shows") {
          items = response.data.tv_shows.map((item: any) => ({
            ...item,
            mediaType: "tv",
          }));
        } else if (activeTab === "Articles") {
          items = response.data.articles.map((item: any) => ({
            ...item,
            mediaType: "article",
          }));
        }

        setTrending(items);

        // Simulate new releases data
        // In a real implementation, you would have a separate API call for this
        setNewReleases(items.slice().reverse());

        // Simulate category data
        // In a real implementation, you would have separate API calls for each category
        const categoriesData: Record<string, any[]> = {};
        categories.slice(2).forEach((category, index) => {
          categoriesData[category] = items.slice(index * 2, index * 2 + 6);
        });
        setCategoryItems(categoriesData);
      } catch (error) {
        console.error("Error fetching trending items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [activeTab, activeFilter]);

  const handleItemClick = (item: any) => {
    // Navigate to the appropriate detail page based on media type
    if (item.mediaType === "movie") {
      router.push(`/movie/${item.id}`);
    } else if (item.mediaType === "tv") {
      router.push(`/tv-show/${item.id}`);
    } else if (item.mediaType === "book") {
      router.push(`/book/${item.id}`);
    } else if (item.mediaType === "article") {
      router.push(`/article/${item.id}`);
    }
  };

  // Helper function to render a media section
  const renderMediaSection = (
    title: string,
    items: any[],
    showViewAll: boolean = true
  ) => (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {showViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="text-sm font-medium"
            asChild
          >
            <Link href={`/explore/${title.toLowerCase().replace(/\s+/g, "-")}`}>
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <ScrollArea className="pb-4">
        <div className="flex space-x-4">
          {items.map((item) => (
            <Card
              key={`${item.mediaType}-${item.id}`}
              className="min-w-[200px] max-w-[200px] cursor-pointer transition-transform hover:scale-105"
              onClick={() => handleItemClick(item)}
            >
              <div className="aspect-[2/3] relative overflow-hidden rounded-t-md">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">No image</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-background/80 text-foreground px-2 py-1 rounded text-xs font-medium">
                  {item.mediaType}
                </div>
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-sm line-clamp-2">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.subtitle}
                  </p>
                )}
                {item.mediaType === "article" && item.read_time && (
                  <div className="mt-2">
                    <span className="text-xs bg-secondary px-2 py-1 rounded-full">
                      {item.read_time}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Explore</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Tabs
          defaultValue="All"
          className="w-full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 py-2 -mb-[2px] data-[state=active]:border-primary data-[state=active]:bg-transparent"
                )}
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
          >
            All
          </Button>
          {categories.slice(2).map((category) => (
            <Button
              key={category}
              variant={
                activeFilter === category.toLowerCase() ? "default" : "outline"
              }
              size="sm"
              onClick={() => setActiveFilter(category.toLowerCase())}
            >
              {category}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {renderMediaSection("Trending Now", trending)}
            {renderMediaSection("New Releases", newReleases)}

            {/* Category Sections */}
            {Object.entries(categoryItems).map(([category, items]) =>
              renderMediaSection(category, items, true)
            )}
          </>
        )}
      </div>
    </div>
  );
}
