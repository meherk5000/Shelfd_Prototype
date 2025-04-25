import { useState, useCallback, useEffect } from 'react';
import api from '@/lib/api';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import useSWR, { useSWRConfig } from "swr";
import { useAuth } from "../context/AuthContext";
import React from 'react';

export type MediaTypeMapping = {
  Books: "book";
  Movies: "movie";
  "TV Shows": "tv";
  Articles: "article";
};

export const mediaTypeMap = {
  "Books": "book",
  "Movies": "movie",
  "TV Shows": "tv",
  "Articles": "article",
};

export const mediaTypeDisplayMap = {
  "Books": "book",
  "Movies": "movie",
  "TV Shows": "tv",
  "Articles": "article",
};

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

export enum ShelfStatus {
  WANT_TO = "want_to",
  CURRENT = "current",
  FINISHED = "finished",
  DNF = "did_not_finish",
  SAVED = "saved"
}

// Add this interface near the top of the file with other type definitions
interface ShelfItem {
  media_id: string;
  title: string;
  cover_image: string;
  creator: string;
  added_at: string;
}

interface Shelf {
  _id: string;
  name: string;
  items: ShelfItem[];
}

// Helper function to get the correct shelf type based on media type and status
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

const fetcher = async (url: string) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export function useShelf() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const { mutate } = useSWRConfig();

  // Remove the global shelves SWR hook since we're not using it
  const getUserShelves = useCallback(async (mediaType: keyof MediaTypeMapping) => {
    if (!isAuthenticated) return [];
    try {
      // Use the mediaTypeMap to get the correct API format
      const mappedType = mediaTypeMap[mediaType];
      
      console.log('Fetching shelves for media type:', mappedType);
      console.log('API URL:', `${API_BASE_URL}/api/shelves/user/${mappedType}`);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/shelves/user/${mappedType}`
      );
      
      // Log the response for debugging
      console.log('Shelves response:', response.data);
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error fetching shelves:", error);
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          mediaType,
          mappedType: mediaTypeMap[mediaType]
        });
      } else {
        console.error("Unknown error:", error);
      }
      throw error;
    }
  }, [isAuthenticated]);

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

      // Get the correct media type format (book, movie, etc.)
      const mappedMediaType = mediaTypeMap[mediaType].toLowerCase();

      // Construct payload
      if (shelfId) {
        // Adding to a specific custom shelf
        payload = {
          shelf_id: shelfId,
          media_id: item.id,
          media_type: mappedMediaType,
          title: item.title,
          image_url: item.image_url,
          creator: item.creator,
          shelf_type: "custom", // Indicate custom shelf type
        };
      } else {
        // Adding to a default shelf based on status
        const shelfType = getShelfType(mediaType, status as ShelfStatus);
        payload = {
          media_id: item.id,
          media_type: mappedMediaType,
          status: status as ShelfStatus, // Ensure status is ShelfStatus enum value
          title: item.title,
          image_url: item.image_url,
          creator: item.creator,
          shelf_type: shelfType, // Pass the determined default shelf type
        };
      }

      console.log("2. API Payload:", payload);

      // Make the API call
      const response = await api.post("/api/shelves/add_item", payload);

      console.log("3. API Response:", response.data);

      // Mutate relevant SWR cache keys to reflect the change
      mutate(`${API_BASE_URL}/api/shelves/user/${mappedMediaType}`);
      if (shelfId) {
        // If added to custom shelf, might need to mutate specific shelf data if cached separately
      }

      setLoading(false);
      console.log("=== END addToShelf (Success) ===");
      return { success: true }; // Indicate success
    } catch (error: any) {
      setLoading(false);
      console.log("=== END addToShelf (Error) ===");
      if (axios.isAxiosError(error)) {
        console.error("Error adding to shelf:", error.response?.data || error.message);
        // Pass the backend error detail back for display
        return {
          success: false,
          message: error.response?.data?.detail || error.message,
        };
      } else {
        // Handle non-Axios errors (like the one we removed)
        console.error("Error adding to shelf:", error.message);
        return { success: false, message: error.message };
      }
    }
  }, [isAuthenticated, getUserShelves, mutate]);

  return {
    getUserShelves,
    getCustomShelves,
    addToShelf,
    loading
  };
}