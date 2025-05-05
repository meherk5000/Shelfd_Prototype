/**
 * useShelf Hook
 * 
 * This custom hook provides functionality for managing user shelves (collections of media items).
 * It handles adding/removing items to shelves, fetching user shelves, and managing shelf display names.
 * 
 * The hook supports different media types (Books, Movies, TV Shows, Articles) and different
 * shelf statuses (want to read/watch, currently reading/watching, finished, etc.).
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { API_BASE_URL } from '../config';
import useSWR, { useSWRConfig } from "swr";
import { useAuth } from "../context/AuthContext";
import React from 'react';

/**
 * Type mapping for media types to their API representation
 * This is used for consistent type checking throughout the application
 */
export type MediaTypeMapping = {
  Books: "book";
  Movies: "movie";
  "TV Shows": "tv";
  Articles: "article";
};

/**
 * Map of frontend media type names to backend API media type values
 */
export const mediaTypeMap = {
  "Books": "book",
  "Movies": "movie",
  "TV Shows": "tv",
  "Articles": "article",
};

/**
 * Map of media types to display values (currently same as API values)
 */
export const mediaTypeDisplayMap = {
  "Books": "book",
  "Movies": "movie",
  "TV Shows": "tv",
  "Articles": "article",
};

/**
 * Enum of shelf types used by the backend API
 * These are the specific shelf type identifiers used in the database
 */
export enum ShelfType {
  WANT_TO_READ = "want_to_read",
  CURRENTLY_READING = "currently_reading",
  FINISHED_READING = "finished_reading",
  DNF_READING = "dnf_reading",
  WANT_TO_WATCH = "want_to_watch",
  CURRENTLY_WATCHING = "currently_watching",
  FINISHED_WATCHING = "finished_watching",
  DNF_WATCHING = "dnf_watching",
  SAVED = "saved",
  FINISHED = "finished",
  CUSTOM = "custom"
}

/**
 * Enum of shelf statuses used for frontend UI
 * These are simplified status values that map to shelf types based on media type
 */
export enum ShelfStatus {
  WANT_TO = "want_to",         // Want to read/watch
  CURRENT = "current",         // Currently reading/watching 
  FINISHED = "finished",       // Finished reading/watching
  DNF = "did_not_finish",      // Did not finish reading/watching
  SAVED = "saved"              // Saved (for articles)
}

/**
 * Interface for a shelf item (a media item that has been added to a shelf)
 */
export interface ShelfItem {
  media_id: string;            // ID of the media item
  title: string;               // Title of the media item
  cover_image: string;         // URL of the cover image
  creator: string;             // Author/director/creator of the media
  added_at: string;            // When the item was added to the shelf
  rating?: number | null;      // User's rating (1-5 stars)
  progress?: number;           // Reading/watching progress (percentage)
}

/**
 * Interface for a shelf
 */
export interface Shelf {
  _id: string;                 // ID of the shelf
  name: string;                // Name of the shelf
  items: ShelfItem[];          // Items in the shelf
  shelf_type: string;          // Type of shelf (from ShelfType enum)
  media_type: string;          // Type of media in the shelf
}

/**
 * Helper function to get the correct shelf type based on media type and status
 * Maps the simplified frontend status to specific backend shelf types
 * 
 * @param mediaType - Type of media (Books, Movies, TV Shows, Articles)
 * @param status - Shelf status (want_to, current, finished, etc.)
 * @returns The correct shelf type string for the backend API
 */
const getShelfType = (mediaType: keyof MediaTypeMapping, status: ShelfStatus): string => {
  switch(mediaType) {
    case "Books":
      switch(status) {
        case ShelfStatus.WANT_TO: return "want_to_read";
        case ShelfStatus.CURRENT: return "currently_reading";
        case ShelfStatus.FINISHED: return "finished_reading";
        case ShelfStatus.DNF: return "dnf_reading";
        default: return "custom";
      }
    case "Movies":
    case "TV Shows":
      switch(status) {
        case ShelfStatus.WANT_TO: return "want_to_watch";
        case ShelfStatus.CURRENT: return "currently_watching";
        case ShelfStatus.FINISHED: return "finished_watching";
        case ShelfStatus.DNF: return "dnf_watching";
        default: return "custom";
      }
    case "Articles":
      switch(status) {
        case ShelfStatus.SAVED: return "saved";
        case ShelfStatus.FINISHED: return "finished";
        default: return "custom";
      }
    default:
      return "custom";
  }
};

/**
 * Mapping of media types and statuses to shelf types
 * This is an alternative to the getShelfType function, using a static object
 * Used for looking up shelf types in different contexts
 */
const shelfTypeMap = {
  Books: {
    want_to: "want_to_read",
    current: "currently_reading",
    finished: "finished_reading",
    did_not_finish: "dnf_reading"
  },
  Articles: {
    saved: "saved",
    finished: "finished"
  },
  Movies: {
    want_to: "want_to_watch",
    current: "currently_watching",
    finished: "finished_watching",
    did_not_finish: "dnf_watching"
  },
  "TV Shows": {
    want_to: "want_to_watch",
    current: "currently_watching",
    finished: "finished_watching",
    did_not_finish: "dnf_watching"
  }
} as const;

/**
 * SWR fetcher function to handle API requests
 * Used for data fetching with proper error handling
 * 
 * @param url - API URL to fetch
 * @returns The API response data
 */
const fetcher = async (url: string) => {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    console.error("Fetcher error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Custom hook for managing user shelves
 * Provides functions for adding/removing items to shelves and fetching shelf data
 * 
 * @returns An object with shelf management functions and state
 */
export function useShelf() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const { mutate } = useSWRConfig();

  /**
   * Fetch all shelves for a given media type belonging to the current user
   * 
   * @param mediaType - Type of media (Books, Movies, TV Shows, Articles)
   * @returns Array of shelf objects
   */
  const getUserShelves = useCallback(async (mediaType: keyof MediaTypeMapping) => {
    if (!isAuthenticated) return [];
    try {
      const mappedType = mediaTypeMap[mediaType];
      console.log('Fetching shelves for media type:', mappedType);
      const url = `/api/shelves/user/${mappedType}`;
      console.log('API URL:', url);
      
      const response = await api.get(url);
      console.log('Shelves response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching shelves:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        mediaType,
        mappedType: mediaTypeMap[mediaType]
      });
      throw error;
    }
  }, [isAuthenticated]);

  /**
   * Fetch only custom shelves for a given media type
   * Custom shelves are user-created shelves beyond the default status shelves
   * 
   * @param mediaType - Type of media (Books, Movies, TV Shows, Articles)
   * @returns Array of custom shelf objects
   */
  const getCustomShelves = useCallback(async (mediaType: keyof MediaTypeMapping) => {
    if (!isAuthenticated) return [];
    try {
      const shelves = await getUserShelves(mediaType);
      const customShelves = shelves.filter((shelf: any) => shelf.shelf_type === "custom");
      return customShelves;
    } catch (error) {
      console.error("Error fetching custom shelves:", error);
      throw error;
    }
  }, [isAuthenticated, getUserShelves]);

  /**
   * Get a user-friendly display name for a shelf status based on media type
   * 
   * @param mediaType - Type of media (Books, Movies, TV Shows, Articles)
   * @param status - Shelf status (want_to, current, finished, etc.)
   * @returns User-friendly display name for the shelf
   */
  const getShelfDisplayName = (mediaType: keyof MediaTypeMapping, status: ShelfStatus) => {
    switch(mediaType) {
      case "Books":
        switch(status) {
          case ShelfStatus.WANT_TO: return "Want to Read";
          case ShelfStatus.CURRENT: return "Currently Reading";
          case ShelfStatus.FINISHED: return "Finished Reading";
          case ShelfStatus.DNF: return "Did Not Finish";
          default: return "Custom";
        }
      case "Movies":
      case "TV Shows":
        switch(status) {
          case ShelfStatus.WANT_TO: return "Want to Watch";
          case ShelfStatus.CURRENT: return "Currently Watching";
          case ShelfStatus.FINISHED: return "Finished Watching";
          case ShelfStatus.DNF: return "Did Not Finish";
          default: return "Custom";
        }
      case "Articles":
        switch(status) {
          case ShelfStatus.SAVED: return "Saved";
          case ShelfStatus.FINISHED: return "Finished";
          default: return "Custom";
        }
      default:
        return "Custom";
    }
  };

  /**
   * Add a media item to a shelf
   * Can add to default status shelves or custom shelves
   * 
   * @param mediaType - Type of media (Books, Movies, TV Shows, Articles)
   * @param status - Shelf status or empty string for custom shelves
   * @param item - Media item to add (id, title, image, creator)
   * @param shelfId - Optional ID for custom shelves
   * @returns API response data
   */
  const addToShelf = useCallback(async (
    mediaType: keyof MediaTypeMapping,
    status: ShelfStatus | string,
    item: {
      id: string;
      title: string;
      image_url?: string;
      creator?: string;
    },
    shelfId?: string
  ) => {
    let payload;
    try {
      setLoading(true);

      console.log("=== START addToShelf ===");
      console.log("1. Input Parameters:", {
        mediaType,
        status,
        item,
        shelfId,
      });

      const mappedMediaType = mediaTypeMap[mediaType].toLowerCase();
      const url = '/api/shelves/add_item';

      // Build payload differently for custom shelves vs. status shelves
      if (shelfId) {
        // Adding to a custom shelf (requires shelf_id)
        payload = {
          shelf_id: shelfId,
          media_id: item.id,
          media_type: mappedMediaType,
          title: item.title,
          image_url: item.image_url,
          creator: item.creator,
        };
      } else {
        // Adding to a default status shelf
        const shelfType = getShelfType(mediaType, status as ShelfStatus);
        payload = {
          media_id: item.id,
          media_type: mappedMediaType,
          title: item.title,
          status: status,
          shelf_type: shelfType,
          image_url: item.image_url,
          creator: item.creator,
        };
      }

      console.log("3. Sending Payload:", payload);
      console.log("4. Target URL:", url);

      const response = await api.post(url, payload);

      console.log("5. Response Status:", response.status);
      console.log("6. Response Data:", response.data);
      console.log("=== END addToShelf ===");

      // Invalidate the cache for this media type to refresh shelf data
      mutate(`${API_BASE_URL}/api/shelves/user/${mappedMediaType}`);

      return response.data;
    } catch (error: any) {
      // Check if it's the specific 409 "already exists" error
      const errorMessage = error.response?.data?.detail || error.message || "Unknown error";
      const isAlreadyExistsError =
        error.response?.status === 409 &&
        typeof errorMessage === 'string' && // Ensure errorMessage is a string
        errorMessage.includes("is already in your"); 

      if (!isAlreadyExistsError) {
          // Log details only if it's NOT the expected 409 error
          console.error("=== ERROR addToShelf ===");
          console.error("Payload causing error:", payload);
          console.error("Error object:", error);
          if (error.response) {
            console.error("Error Response Data:", error.response.data);
            console.error("Error Response Status:", error.response.status);
            console.error("Error Response Headers:", error.response.headers);
          } else if (error.request) {
            console.error("Error Request Data:", error.request);
          } else {
            console.error('Error Message:', error.message);
          }
      } else {
          // Optionally log that the handled error occurred in the hook
          console.log(`[useShelf] Handled 409 error: ${errorMessage}`);
      }

      // Always re-throw the error so the calling component can handle it (e.g., show toast)
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutate]);

  /**
   * Remove a media item from a shelf
   * 
   * @param mediaType - Type of media (Books, Movies, TV Shows, Articles)
   * @param itemId - ID of the media item to remove
   */
  const removeFromShelf = useCallback(async (mediaType: keyof MediaTypeMapping, itemId: string) => {
    setLoading(true);
    try {
      const apiMediaType = mediaTypeMap[mediaType];
      if (!apiMediaType) {
        throw new Error(`Invalid media type provided to removeFromShelf: ${mediaType}`);
      }
      await api.delete(`/api/shelves/${apiMediaType}/${itemId}`);
      
      // Invalidate the cache for this media type to refresh shelf data
      mutate(`${API_BASE_URL}/api/shelves/user/${apiMediaType}`);
    } catch (error) {
      console.error("Error removing item:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutate]);

  // Return the public API of the hook
  return {
    addToShelf,            // Add an item to a shelf
    removeFromShelf,       // Remove an item from a shelf
    getUserShelves,        // Get all shelves for a media type
    getCustomShelves,      // Get only custom shelves for a media type
    getShelfDisplayName,   // Get display name for a shelf status
    loading,               // Loading state for async operations
  };
}