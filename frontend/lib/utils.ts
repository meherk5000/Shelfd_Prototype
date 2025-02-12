import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getMediaType = (type: string): string => {
  const mediaTypes = {
    books: "book",
    movies: "movie",
    "tv-shows": "tv_show",
    articles: "article",
  };
  return mediaTypes[type as keyof typeof mediaTypes] || "book";
};
