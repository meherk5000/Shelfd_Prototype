"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Grid, List, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useShelf } from "@/lib/hooks/use-shelf";
import { toast } from "react-hot-toast";
import { TrashIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";

interface ShelfListProps {
  type: MediaType;
  initialList: string;
  onRemove?: (bookId: string) => void;
}

export function ShelfList({ type, initialList, onRemove }: ShelfListProps) {
  const [items, setItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const { getUserShelves } = useShelf();

  useEffect(() => {
    let mounted = true;

    const fetchShelfItems = async () => {
      try {
        const mediaType =
          type === "tv-shows"
            ? "TV Shows"
            : type.charAt(0).toUpperCase() + type.slice(1);

        const shelves = await getUserShelves(mediaType as any);
        if (!mounted) return;

        const targetShelf = shelves.find(
          (shelf: any) => shelf.name.toLowerCase() === initialList.toLowerCase()
        );

        if (targetShelf && mounted) {
          console.log("Raw shelf items:", targetShelf.items);

          const transformedItems = targetShelf.items.map((item: any) => {
            const mediaId = item.media_id || item.id;
            if (!mediaId) {
              console.warn("Item without any ID:", item);
            }
            return {
              id: mediaId,
              title: item.title,
              image: item.cover_image || "/placeholder.svg",
              creator: item.creator,
              dateAdded: item.added_at,
              rating: item.rating,
              progress: item.progress,
            };
          });

          console.log("Transformed items:", transformedItems);
          setItems(transformedItems);
        }
      } catch (error) {
        console.error("Error fetching shelf items:", error);
        if (mounted) setItems([]);
      }
    };

    fetchShelfItems();
    return () => {
      mounted = false;
    };
  }, [type, initialList, getUserShelves]);

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const removeFromShelf = async (itemId: string) => {
    try {
      if (!itemId) {
        toast.error("Cannot remove item: Invalid ID");
        return;
      }

      await api.delete(`/api/shelves/${type}/${itemId}`);

      toast.success("Item removed from shelf");
      setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error(
        error.response?.data?.detail || "Failed to remove item from shelf"
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Button */}
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search in list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
          {filteredItems.map((item, index) => (
            <div
              key={item.id || `grid-${index}`}
              className="group relative space-y-3 cursor-pointer"
            >
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeFromShelf(item.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Remove from shelf"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="aspect-[2/3] overflow-hidden rounded-lg">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium line-clamp-1">{item.title}</h3>
                {item.creator && (
                  <p className="text-sm text-muted-foreground">
                    by {item.creator}
                  </p>
                )}
                {item.rating && (
                  <div className="flex items-center text-sm text-yellow-500">
                    {item.rating.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-card rounded-lg border"
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
              {item.dateAdded && (
                <span className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {new Date(item.dateAdded).toLocaleDateString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => removeFromShelf(item.id)}
              >
                <TrashIcon className="h-5 w-5 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="text-muted-foreground text-sm">
          No items in this list yet
        </div>
      )}
    </div>
  );
}
