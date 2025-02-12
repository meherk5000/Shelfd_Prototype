interface MediaCardProps {
  id: number;
  image: string;
  title: string;
}

export function MediaCard({ id, image, title }: MediaCardProps) {
  return (
    <div className="break-inside-avoid mb-4">
      <img
        src={image}
        alt={title}
        className="w-full rounded-lg shadow-sm hover:shadow-lg transition-shadow"
      />
      <h3 className="mt-2 text-sm font-medium">{title}</h3>
    </div>
  );
}
