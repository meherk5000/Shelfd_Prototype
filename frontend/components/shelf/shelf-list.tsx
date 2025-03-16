"use client";

import { useEffect, useState } from "react";
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

  const items =
    targetShelf?.items.map((item: any) => {
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
        rating: item.rating,
        progress: item.progress,
      };
    }) || [];

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-clamp-1">{item.title}</h3>
                    {item.creator && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        by {item.creator}
                      </p>
                    )}
                  </div>
                  <ItemMenu itemId={item.id} />
                </div>
                {item.rating && (
                  <div className="flex items-center text-sm text-yellow-500 mt-1">
                    {item.rating.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-4 p-4 bg-card rounded-lg border"
            >
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
              <ItemMenu itemId={item.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
