import Link from "next/link";
import Image from "next/image";
import type { MediaTypeMapping } from "@/lib/hooks/use-shelf";

interface MediaPreviewProps {
  shelf: {
    _id: string;
    name: string;
    items: Array<{
      id?: string;
      media_id?: string;
      title: string;
      cover_image?: string;
      image?: string;
      creator?: string;
    }>;
  };
  mediaType: string;
}

export function MediaPreview({ shelf, mediaType }: MediaPreviewProps) {
  const { name, items } = shelf;
  const urlTitle = name.toLowerCase().replace(/\s+/g, "-");
  const mediaTypeSlug =
    mediaType === "TV Shows" ? "tv-shows" : mediaType.toLowerCase();

  return (
    <Link
      href={`/shelf/${mediaTypeSlug}/${urlTitle}`}
      className="block space-y-3 bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-semibold text-primary">{name}</h2>
        <span className="text-sm font-medium text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 aspect-[3/2] overflow-hidden rounded-md">
        {items.slice(0, 3).map((item, index) => {
          const imageUrl = item.cover_image || item.image || "/placeholder.svg";
          return (
            <div
              key={`${shelf._id}-${item.id || item.media_id}-${index}`}
              className={`relative overflow-hidden bg-muted ${
                index === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <Image
                src={imageUrl}
                alt={item.title}
                width={500}
                height={750}
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                priority={index === 0}
              />
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-3 aspect-[3/2] flex items-center justify-center bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">No items yet</p>
          </div>
        )}
      </div>
    </Link>
  );
}

// Helper function to determine media type from list title
function getMediaType(title: string, activeTab?: string): string {
  // If we have an activeTab, use it to determine the base media type
  if (activeTab) {
    switch (activeTab) {
      case "Books":
        return "books";
      case "TV Shows":
        return "tv-shows";
      case "Movies":
        return "movies";
      case "Articles":
        return "articles";
    }
  }

  // Fallback to checking title keywords if no activeTab
  if (title.includes("Watch")) return "tv-shows";
  if (title.includes("Read")) return "books";
  if (title.includes("Movie")) return "movies";
  if (title.includes("Article")) return "articles";

  return "unknown";
}
