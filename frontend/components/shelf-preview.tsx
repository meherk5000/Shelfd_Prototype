import Link from "next/link";
import { getMediaType } from "@/lib/utils";
import type { MediaTypeMapping } from "@/lib/hooks/use-shelf";

interface ShelfPreviewProps {
  title: string;
  count: string;
  items: any[];
  activeTab: keyof MediaTypeMapping;
}

export function ShelfPreview({
  title,
  count,
  items,
  activeTab,
}: ShelfPreviewProps) {
  const urlTitle = title.toLowerCase().replace(/\s+/g, "-");

  return (
    <Link
      href={`/shelf/${getMediaType(title, activeTab)}/${urlTitle}`}
      className="block space-y-3 bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <span className="text-sm font-medium text-muted-foreground">
          {count}
        </span>
      </div>
    </Link>
  );
}
