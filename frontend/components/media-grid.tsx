interface MediaItem {
  id: number
  title: string
  image: string
}

interface MediaGridProps {
  title: string
  count: number
  items: MediaItem[]
}

export function MediaGrid({ title, count, items }: MediaGridProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <div key={item.id} className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
            <img
              src={item.image || "/placeholder.svg"}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute bottom-0 p-4">
                <h3 className="text-sm font-medium text-white">{item.title}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

