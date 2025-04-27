"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Grid, List, Filter, Search, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useShelf } from "@/lib/hooks/use-shelf";
import { toast } from "react-hot-toast";
import { TrashIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import { MediaType } from "@/lib/types";
import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaTypeMapping, mediaTypeMap } from "@/lib/hooks/use-shelf";

// Define interface for shelf items used in this component
interface DisplayShelfItem {
  id: string;
  title: string;
  image: string;
  creator?: string;
  dateAdded?: string;
  rating?: number | null; // Allow null for rating
  progress?: number;
}

// Helper function to render stars
const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <svg
          key={`full-${i}`}
          className="w-4 h-4 text-yellow-400 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
      {/* Add half star logic if needed, for simplicity only full stars for now */}
      {[...Array(emptyStars)].map((_, i) => (
        <svg
          key={`empty-${i}`}
          className="w-4 h-4 text-gray-300 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  );
};

interface ShelfListProps {
  type: MediaType;
  initialList: string;
  onRemove?: (bookId: string) => void;
}

export function ShelfList({ type, initialList, onRemove }: ShelfListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const { getUserShelves } = useShelf();

  const mediaType =
    type === "tv-shows"
      ? "TV Shows"
      : type.charAt(0).toUpperCase() + type.slice(1);

  const {
    data: shelves,
    error,
    isLoading,
    mutate,
  } = useSWR(
    `${API_BASE_URL}/api/shelves/user/${
      mediaTypeMap[mediaType as keyof MediaTypeMapping]
    }`,
    () => getUserShelves(mediaType as keyof MediaTypeMapping),
    {
      refreshInterval: 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      onSuccess: (data) => {
        console.log("ShelfList - Received updated shelf data:", data);
      },
    }
  );

  useEffect(() => {
    console.log("ShelfList - Revalidating shelves for type:", mediaType);
    console.log("ShelfList - Current shelves:", shelves);
    mutate();
  }, [mutate, mediaType]);

  const targetShelf = shelves?.find(
    (shelf: any) => shelf.name.toLowerCase() === initialList.toLowerCase()
  );

  useEffect(() => {
    if (shelves) {
      console.log("ShelfList - All shelves:", shelves);
      console.log("ShelfList - Target shelf:", targetShelf);
      console.log("ShelfList - Looking for shelf with name:", initialList);
      if (targetShelf) {
        console.log("ShelfList - Target shelf items:", targetShelf.items);
      }
    }
  }, [shelves, targetShelf, initialList]);

  // Use the DisplayShelfItem interface for typing
  const items: DisplayShelfItem[] =
    targetShelf?.items.map((item: any): DisplayShelfItem => {
      // Add return type
      const mediaId = item.media_id || item.id;
      if (!mediaId) {
        console.warn("Item without any ID:", item);
      }
      return {
        id: mediaId,
        title: item.title,
        image: item.cover_image || item.image || "/placeholder.svg",
        creator: item.creator,
        dateAdded: item.added_at,
        rating: item.rating, // Rating is now included
        progress: item.progress,
      };
    }) || [];

  // Type the item in the filter function
  const filteredItems = items.filter((item: DisplayShelfItem) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get the correct detail page path based on media type
  const getDetailPath = (mediaType: MediaType, id: string): string => {
    switch (mediaType) {
      case "books":
        return `/books/${id}`;
      case "movies":
        return `/movies/${id}`;
      case "tv-shows":
        return `/tv/${id}`; // Use /tv/ for tv-shows
      case "articles":
        return `/articles/${id}`; // Assuming /articles/ for articles
      default:
        return "/"; // Fallback path
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading shelf items</div>;
  }

  const handleRemove = async (itemId: string) => {
    try {
      await api.delete(`/api/shelves/${type}/${itemId}`);
      await mutate();
      toast.success("Item removed from shelf");
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast.error(
        error.response?.data?.detail || "Failed to remove item from shelf"
      );
    }
  };

  const ItemMenu = ({ itemId }: { itemId: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => handleRemove(itemId)}
        >
          <TrashIcon className="h-4 w-4 mr-2" />
          Remove from shelf
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Type item and index here */}
          {filteredItems.map((item: DisplayShelfItem, index: number) => (
            <Link key={item.id} href={getDetailPath(type, item.id)} passHref>
              <div className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                <div className="aspect-[2/3] relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-1">
                          {item.title}
                        </h3>
                        {item.creator && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            by {item.creator}
                          </p>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ItemMenu itemId={item.id} />
                      </div>
                    </div>
                    {item.rating && (
                      <div className="flex items-center text-sm mt-1">
                        <span className="text-muted-foreground mr-1.5">
                          Your Rating:
                        </span>
                        <StarRating rating={item.rating} />
                        <span className="ml-1 font-medium">
                          {item.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Type item here */}
          {filteredItems.map((item: DisplayShelfItem) => (
            <Link key={item.id} href={getDetailPath(type, item.id)} passHref>
              <div className="group flex items-center gap-4 p-4 bg-card rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg mb-1">{item.title}</h3>
                  {item.creator && (
                    <p className="text-sm text-muted-foreground">
                      by {item.creator}
                    </p>
                  )}
                  {item.rating && (
                    <div className="flex items-center text-sm mt-1">
                      <span className="text-muted-foreground mr-1.5">
                        Your Rating:
                      </span>
                      <StarRating rating={item.rating} />
                      <span className="ml-1 font-medium">
                        {item.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                {item.progress !== undefined && (
                  <div className="w-32 flex-shrink-0">
                    <div className="h-2 bg-muted rounded-full">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div onClick={(e) => e.stopPropagation()}>
                  <ItemMenu itemId={item.id} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
