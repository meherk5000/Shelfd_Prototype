"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Grid, List, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  useShelf,
  Shelf,
  ShelfItem,
  MediaTypeMapping,
  mediaTypeMap,
} from "@/lib/hooks/use-shelf";
import { toast } from "sonner";
import { TrashIcon } from "@heroicons/react/24/outline";
import { MediaType } from "@/lib/types";
import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/context/AuthContext";

// Define interface for shelf items used in this component
interface DisplayShelfItem {
  id: string;
  title: string;
  image: string;
  creator?: string;
  dateAdded?: string;
  rating?: number | null;
  progress?: number;
}

// Helper function to render stars
const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.25 && rating % 1 < 0.75;
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
      {halfStar && (
        <svg
          key="half"
          className="w-4 h-4 text-yellow-400 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0v15z" />
          <path
            fill="currentColor"
            className="text-gray-300"
            d="M10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545L10 15V0z"
          />
        </svg>
      )}
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
}

export function ShelfList({ type, initialList }: ShelfListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    getUserShelves,
    removeFromShelf,
    loading: shelfActionLoading,
  } = useShelf();
  const { isAuthenticated } = useAuth();

  // Log the current authentication status on each render
  console.log(`[ShelfList Render] isAuthenticated: ${isAuthenticated}`);

  const mediaType =
    type === "tv-shows"
      ? "TV Shows"
      : type.charAt(0).toUpperCase() + type.slice(1);

  // <<< START LOGGING >>>
  console.log(`[ShelfList] Received 'type' prop: ${type}`);
  const backendMediaTypeKey = mediaTypeMap[mediaType as keyof MediaTypeMapping];
  console.log(
    `[ShelfList] Derived 'backendMediaTypeKey': ${backendMediaTypeKey}`
  );
  // <<< END LOGGING >>>

  const swrKey = isAuthenticated
    ? `${API_BASE_URL}/api/shelves/user/${backendMediaTypeKey}`
    : null;
  const {
    data: swrData,
    error: swrError,
    isLoading: swrIsLoading,
    mutate: swrMutate,
  } = useSWR<Shelf[] | null>(
    swrKey,
    () =>
      isAuthenticated && backendMediaTypeKey
        ? getUserShelves(mediaType as keyof MediaTypeMapping)
        : Promise.resolve(null),
    { revalidateOnFocus: true }
  );

  // swrData directly contains the array of shelves, or null/undefined if loading/error
  const shelves: Shelf[] = swrData || [];

  const targetShelf = shelves?.find(
    (shelf: Shelf) => shelf.name.toLowerCase() === initialList.toLowerCase()
  );

  useEffect(() => {
    if (swrData) {
      console.log("[ShelfList Effect] SWR data IS present:", swrData);
      console.log("[ShelfList Effect] Extracted Shelves:", shelves);
      console.log("[ShelfList Effect] Target shelf:", targetShelf);
      console.log("[ShelfList Effect] Looking for shelf name:", initialList);
      if (targetShelf) {
        console.log(
          "[ShelfList Effect] Target shelf items:",
          targetShelf.items
        );
      }
    } else {
      console.log("[ShelfList Effect] SWR data is null/undefined.");
    }
    if (swrError) {
      console.error("[ShelfList Effect] SWR Error detected:", swrError);
    }
  }, [swrData, shelves, targetShelf, initialList, swrError]);

  const items: DisplayShelfItem[] =
    targetShelf?.items.map(
      (item: ShelfItem): DisplayShelfItem => ({
        id: item.media_id,
        title: item.title,
        image: item.cover_image || "/placeholder.svg",
        creator: item.creator,
        dateAdded: item.added_at,
        rating: item.rating,
        progress: item.progress,
      })
    ) || [];

  const filteredItems = items.filter((item: DisplayShelfItem) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDetailPath = (mediaType: MediaType, id: string): string => {
    switch (mediaType) {
      case "books":
        return `/books/${id}`;
      case "movies":
        return `/movies/${id}`;
      case "tv-shows":
        return `/tv/${id}`;
      case "articles":
        return `/article/${id}`;
      default:
        return "/";
    }
  };

  const handleRemove = async (itemId: string) => {
    const itemTitle =
      items.find((i: DisplayShelfItem) => i.id === itemId)?.title || "Item";
    if (!targetShelf?._id) {
      toast.error("Could not determine the shelf ID to remove the item from.");
      console.error(
        "Cannot remove item: targetShelf or targetShelf._id is undefined."
      );
      return;
    }
    try {
      await removeFromShelf(mediaType as keyof MediaTypeMapping, itemId);
      toast.success(`'${itemTitle}' removed from shelf`);
      swrMutate();
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast.error(error.message || "Failed to remove item from shelf");
    }
  };

  if (!isAuthenticated && !swrIsLoading) {
    return <div>Please log in to view your shelves.</div>;
  }
  if (swrIsLoading) {
    return <div>Loading shelf items...</div>;
  }
  if (swrError) {
    console.error("[ShelfList] SWR Error:", swrError);
    return <div>Error loading shelf items. Please try refreshing.</div>;
  }
  if (!targetShelf && !swrIsLoading) {
    console.warn(
      `[ShelfList] Shelf named '${initialList}' not found for type '${type}'. Available shelves:`,
      shelves?.map((s: Shelf) => s.name)
    );
    return <div>Shelf '{initialList}' not found.</div>;
  }

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
          {filteredItems.map((item: DisplayShelfItem) => (
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
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <ItemMenu itemId={item.id} />
                      </div>
                    </div>
                    {typeof item.rating === "number" && !isNaN(item.rating) && (
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        Your Rating:
                        <StarRating rating={item.rating} />
                        <span className="ml-1 font-medium">
                          ({item.rating.toFixed(1)})
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
                  {typeof item.rating === "number" && !isNaN(item.rating) && (
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      Your Rating:
                      <StarRating rating={item.rating} />
                      <span className="ml-1 font-medium">
                        ({item.rating.toFixed(1)})
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
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
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
