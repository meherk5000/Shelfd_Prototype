"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { getTrendingMedia } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, SlidersHorizontal, Star, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface MediaItem {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  mediaType: string;
  overview?: string;
  read_time?: string;
  rating?: number;
}

export default function TrendingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [maxRating, setMaxRating] = useState<number | undefined>(undefined);
  const [tempMinRating, setTempMinRating] = useState(0);
  const [tempMaxRating, setTempMaxRating] = useState(10);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchItems();
  }, [activeTab, minRating, maxRating, page]);

  const fetchItems = async (resetPage = false) => {
    if (resetPage && page !== 1) {
      setPage(1);
      return; // The useEffect will trigger another fetch with page=1
    }

    setLoading(true);
    try {
      const options = {
        minRating,
        maxRating,
        page,
        limit: itemsPerPage,
      };

      const data = await getTrendingMedia(activeTab, options);

      if (page === 1) {
        setItems(data.results || []);
      } else {
        setItems((prev) => [...prev, ...(data.results || [])]);
      }

      // Determine if there are more items to load
      setHasMore((data.results || []).length === itemsPerPage);
    } catch (error) {
      console.error("Error fetching trending items:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const applyFilters = () => {
    setMinRating(tempMinRating === 0 ? undefined : tempMinRating);
    setMaxRating(tempMaxRating === 10 ? undefined : tempMaxRating);
    setFiltersApplied(tempMinRating > 0 || tempMaxRating < 10);
    fetchItems(true);
  };

  const clearFilters = () => {
    setTempMinRating(0);
    setTempMaxRating(10);
    setMinRating(undefined);
    setMaxRating(undefined);
    setFiltersApplied(false);
    fetchItems(true);
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mr-2"
            onClick={() => router.push("/explore")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Explore
          </Button>
          <h1 className="text-3xl font-bold">Trending Now</h1>

          <div className="ml-auto flex items-center gap-2">
            {filtersApplied && (
              <Badge variant="outline" className="flex items-center gap-1">
                Rating: {minRating || 0} - {maxRating || 10}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={clearFilters}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Options</SheetTitle>
                  <SheetDescription>
                    Adjust the filters to customize your trending results.
                  </SheetDescription>
                </SheetHeader>

                <div className="py-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-base">Rating Range</Label>
                      <div className="flex items-center text-sm">
                        <Star
                          className="h-3 w-3 mr-1 text-yellow-500"
                          fill="currentColor"
                        />
                        {tempMinRating} - {tempMaxRating}
                      </div>
                    </div>
                    <div className="px-1">
                      <Slider
                        defaultValue={[tempMinRating, tempMaxRating]}
                        max={10}
                        step={0.5}
                        onValueChange={(value) => {
                          setTempMinRating(value[0]);
                          setTempMaxRating(value[1]);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <SheetFooter className="flex-col sm:flex-row gap-2">
                  <SheetClose asChild>
                    <Button variant="outline" onClick={clearFilters}>
                      Reset Filters
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button onClick={applyFilters}>Apply Filters</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Tabs
          defaultValue="All"
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setPage(1);
          }}
        >
          <TabsList className="mb-8">
            <TabsTrigger value="All">All</TabsTrigger>
            <TabsTrigger value="Movies">Movies</TabsTrigger>
            <TabsTrigger value="TV Shows">TV Shows</TabsTrigger>
            <TabsTrigger value="Books">Books</TabsTrigger>
            <TabsTrigger value="Articles">Articles</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading && page === 1 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-[240px] w-full" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-3 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => (
                <Card
                  key={`${item.mediaType}-${item.id}`}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleMediaClick(item)}
                >
                  <div className="relative h-[240px] w-full">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
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
                    {item.rating && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center">
                        <Star
                          className="h-3 w-3 mr-1 text-yellow-500"
                          fill="currentColor"
                        />
                        {item.rating.toFixed(1)}
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

            {loading && page > 1 && (
              <div className="flex justify-center items-center h-20 mt-6">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            {hasMore && !loading && (
              <div className="flex justify-center mt-8">
                <Button onClick={loadMore} disabled={loading} className="px-8">
                  Load More
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              No trending items found for {activeTab.toLowerCase()}.
              {filtersApplied &&
                " Try adjusting your filters or selecting a different tab."}
              {!filtersApplied && " Try selecting a different tab."}
            </p>
            {filtersApplied && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
