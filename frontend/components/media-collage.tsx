interface MediaItem {
  id: number;
  image: string;
  title: string;
}

interface MediaCollageProps {
  title: string;
  count: string;
  items: MediaItem[];
}

export function MediaCollage({ title, count, items }: MediaCollageProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">{count}</span>
      </div>
      <div className="grid grid-cols-6 gap-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`relative overflow-hidden rounded-lg bg-muted ${
              index === 0 ? "col-span-4 row-span-2" : "col-span-2"
            }`}
          >
            <div className={index === 0 ? "aspect-[4/3]" : "aspect-square"}>
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
