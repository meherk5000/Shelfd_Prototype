import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add the getMediaType function
export const getMediaType = (type: string): string => {
  const lowerType = type.toLowerCase();
  switch (lowerType) {
    case "movies":
      return "movies";
    case "books":
      return "books";
    case "tv shows": // Handle potential space
      return "tv-shows";
    case "tv-shows": // Handle potential hyphen
      return "tv-shows";
    case "articles":
      return "article"; // Singular for article path
    default:
      console.warn(`[getMediaType] Unknown type: ${type}, defaulting to lowercased version.`);
      return lowerType; // Fallback to lowercased input
  }
};
