"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus } from "lucide-react";
import { useShelf, type MediaTypeMapping } from "@/lib/hooks/use-shelf";
import { MediaPreview } from "@/components/media-preview";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mediaTypes: Array<keyof MediaTypeMapping> = [
  "Books",
  "Articles",
  "Movies",
  "TV Shows",
];

export default function ShelfPage() {
  const [activeTab, setActiveTab] = useState<keyof MediaTypeMapping>("Books");
  const { getUserShelves, loading } = useShelf();
  const [shelfData, setShelfData] = useState<any[]>([]);

  const fetchShelfData = useCallback(async () => {
    try {
      const data = await getUserShelves(activeTab);
      setShelfData(data);
    } catch (error) {
      console.error("Failed to fetch shelf data:", error);
      setShelfData([]);
    }
  }, [activeTab, getUserShelves]);

  useEffect(() => {
    fetchShelfData();
  }, [fetchShelfData]);

  return (
    <Layout>
      <div className="space-y-8 px-4 py-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create New Shelf List
          </Button>
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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {shelfData.map((shelf, index) => (
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
