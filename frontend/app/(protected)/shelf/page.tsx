"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useShelf, type MediaTypeMapping } from "@/lib/hooks/use-shelf";
import { MediaPreview } from "@/components/media-preview";
import { Layout } from "@/components/layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateShelfDialog } from "@/components/shelf/create-shelf-dialog";
import useSWR from "swr";

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
            {(shelfData || []).map((shelf, index) => (
              <MediaPreview
                key={shelf._id}
                shelf={shelf}
                mediaType={activeTab}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
