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
  "TV Shows": "tv_show";
  Articles: "article";
};

export const mediaTypeMap = {
  Books: "book",
  Articles: "article",
  Movies: "movie",
  "TV Shows": "tv_show"
} as const;

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
      const response = await axios.get(
        `${API_BASE_URL}/api/shelves/user/${mappedType}`
      );
      
      // Log the response for debugging
      console.log('Shelves response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error("Error fetching shelves:", error);
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
      
      console.log('=== START addToShelf ===');
      console.log('1. Input Parameters:', {
        mediaType,
        status,
        item,
        shelfId
      });

      // First check if the item is already in any shelf
      const mappedType = mediaTypeMap[mediaType].toLowerCase();
      const shelves = await getUserShelves(mediaType);
      
      // Check each shelf for the item
      for (const shelf of shelves) {
        const itemExists = shelf.items.some((shelfItem: any) => shelfItem.media_id === item.id);
        if (itemExists) {
          throw new Error(`This ${mediaType.toLowerCase()} is already in your "${shelf.name}" shelf`);
        }
      }

      // Get the correct media type format (book, movie, etc.)
      const mappedMediaType = mediaTypeMap[mediaType].toLowerCase();
      console.log('2. Mapped Media Type:', mappedMediaType);
      
      // Get the shelf type based on media type and status
      const shelfType = getShelfType(mediaType, status as ShelfStatus).toUpperCase();
      console.log('3. Generated Shelf Type:', shelfType);
      
      const mappedStatus = status.toString().toLowerCase();
      console.log('4. Mapped Status:', mappedStatus);

      // Base payload properties
      const basePayload = {
        media_type: mappedMediaType,
        media_id: String(item.id),
        title: item.title,
        image_url: item.image_url || "/placeholder.svg",
        creator: item.creator || ""
      };
      console.log('5. Base Payload:', basePayload);

      // Construct the final payload based on whether it's a custom shelf
      if (shelfId) {
        payload = {
          ...basePayload,
          shelf_id: shelfId
        };
      } else {
        payload = {
          ...basePayload,
          shelf_type: shelfType,
          status: mappedStatus
        };
      }

      console.log('6. Final Payload:', JSON.stringify(payload, null, 2));
      console.log('7. API endpoint:', `${API_BASE_URL}/api/shelves/add_item`);
      
      const response = await axios.post(`${API_BASE_URL}/api/shelves/add_item`, payload);
      console.log('8. API Response:', response.data);

      // Use the mutate function from useSWRConfig to update all relevant cache keys
      const cache_key = `${API_BASE_URL}/api/shelves/user/${mappedMediaType}`;
      console.log('9. Cache Key for Revalidation:', cache_key);
      
      // Force revalidation of the cache
      await mutate(cache_key, undefined, { revalidate: true });
      
      // Also revalidate the getUserShelves data
      await mutate(() => getUserShelves(mediaType));
      
      console.log('=== END addToShelf - Success ===');
      return { success: true, data: response.data };
    } catch (error: any) {
      console.log('=== END addToShelf - Error ===');
      console.error('Detailed Error Information:', {
        message: error.message,
        responseData: error.response?.data,
        responseStatus: error.response?.status,
        requestPayload: payload,
        stackTrace: error.stack
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutate, getUserShelves]);

  return {
    getUserShelves,
    getCustomShelves,
    addToShelf,
    loading
  };
}