import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 * This is super helpful because it combines clsx (for conditional classes)
 * with twMerge (which handles Tailwind class conflicts correctly)
 * 
 * Example usage:
 * cn("text-red-500", isActive && "font-bold", "p-4")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts media type strings to consistent URL-friendly formats
 * This is needed because media types might come in different formats
 * from different parts of the app, but we need consistency for URLs
 * 
 * @param type - The raw media type string (e.g., "TV Shows", "movies")
 * @returns - Normalized string for route paths
 */
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
      return "article"; // Singular for article path (seems inconsistent - maybe a bug?)
    default:
      console.warn(`[getMediaType] Unknown type: ${type}, defaulting to lowercased version.`);
      return lowerType; // Fallback to lowercased input
  }
};
