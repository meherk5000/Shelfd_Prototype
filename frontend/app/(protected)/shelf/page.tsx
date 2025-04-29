"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  useShelf,
  type MediaTypeMapping,
  ShelfStatus,
} from "@/lib/hooks/use-shelf";
import { MediaPreview } from "@/components/media-preview";
import { Layout } from "@/components/layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateShelfDialog } from "@/components/shelf/create-shelf-dialog";
import useSWR from "swr";

// Define a more complete Shelf type for this page
interface Shelf {
  _id: string;
  name: string;
  shelf_type: string; // Added shelf_type
  status: ShelfStatus | string; // Added status field
  items: any[]; // Keeping items simple for now, adjust if MediaPreview needs more detail
}

const mediaTypes: Array<keyof MediaTypeMapping> = [
  "Books",
  "Articles",
  "Movies",
  "TV Shows",
];

export default function ShelfPage() {
  const [activeTab, setActiveTab] = useState<keyof MediaTypeMapping>("Books");
  const { getUserShelves } = useShelf();

  const {
    data: shelfData,
    error,
    isLoading,
  } = useSWR(["shelves", activeTab], () => getUserShelves(activeTab), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Define sort order for default shelf statuses
  const bookMovieTvStatusOrder: { [key: string]: number } = {
    [ShelfStatus.WANT_TO]: 1,
    [ShelfStatus.CURRENT]: 2,
    [ShelfStatus.FINISHED]: 3,
    [ShelfStatus.DNF]: 4,
  };

  const articleStatusOrder: { [key: string]: number } = {
    [ShelfStatus.SAVED]: 1,
    [ShelfStatus.FINISHED]: 2,
  };

  const sortedShelfData = (shelfData || [])
    .slice() // Create a shallow copy
    .sort((a: Shelf, b: Shelf) => {
      const isADefault = a.shelf_type !== "custom";
      const isBDefault = b.shelf_type !== "custom";

      // Group Default shelves before Custom shelves
      if (isADefault && !isBDefault) return -1;
      if (!isADefault && isBDefault) return 1;

      // If both are Custom, sort alphabetically by name
      if (!isADefault && !isBDefault) {
        return a.name.localeCompare(b.name);
      }

      // If both are Default, sort by predefined status order
      const orderMap =
        activeTab === "Articles" ? articleStatusOrder : bookMovieTvStatusOrder;
      // Use 99 as default order for any unexpected statuses
      const aOrder = orderMap[a.status] || 99;
      const bOrder = orderMap[b.status] || 99;

      return aOrder - bOrder;
    });

  return (
    <Layout>
      <div className="space-y-8 px-4 py-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <CreateShelfDialog />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as keyof MediaTypeMapping)
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 bg-muted rounded-lg p-1">
            {mediaTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className="text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error loading shelves
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Map over the explicitly sorted data */}
            {sortedShelfData.map((shelf: Shelf, index: number) => (
              <MediaPreview
                key={shelf._id}
                shelf={shelf} // Pass the whole shelf object
                mediaType={activeTab}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
