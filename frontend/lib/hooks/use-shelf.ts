import { useState, useCallback } from 'react';
import api from '@/lib/api';
import axios from 'axios';

export type MediaTypeMapping = {
  Books: "book";
  Movies: "movie";
  "TV Shows": "tv_show";
  Articles: "article";
};

const mediaTypeMap = {
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
  id: string;
  title: string;
  cover_image?: string;
  creator?: string;
  added_at?: string;
  status?: string;
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

export function useShelf() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeShelves = async () => {
    try {
      await api.post('/api/shelves/create_default');
    } catch (err) {
      console.error('Failed to initialize shelves:', err);
    }
  };

  const addToShelf = async (
    mediaType: keyof MediaTypeMapping,
    status: ShelfStatus,
    item: {
      id: string;
      title: string;
      image_url?: string;
      creator?: string;
    }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // First check if item already exists in any shelf of this media type
      const shelves = await getUserShelves(mediaType);
      const shelfType = getShelfType(mediaType, status);
      
      // Check if item already exists in the target shelf
      const targetShelf = shelves.find((shelf: { 
        name: string; 
        items?: ShelfItem[];
      }) => 
        shelf.name.toLowerCase() === shelfType.replace(/_/g, ' ').toLowerCase()
      );

      console.log('Debug - Target Shelf:', targetShelf);
      console.log('Debug - New Item ID:', item.id);
      console.log('Debug - Existing Items:', targetShelf?.items);

      // Check both media_id and id fields for existing items
      const itemExists = targetShelf?.items?.some((existingItem: ShelfItem) => 
        (existingItem.media_id === item.id || existingItem.id === item.id)
      );

      console.log('Debug - Item Exists Check:', itemExists);

      if (itemExists) {
        console.log("Item already exists in this shelf");
        return { success: false, message: "Item already exists in this shelf" };
      }

      // If item doesn't exist, proceed with adding it
      const apiMediaType = mediaTypeMap[mediaType];
      const apiStatus = status.toLowerCase();

      const payload = {
        media_type: apiMediaType,
        media_id: item.id,
        status: apiStatus,
        title: item.title,
        shelf_type: shelfType.toUpperCase(),
        image_url: item.image_url || "",
        creator: item.creator || ""
      };

      console.log('Debug - Adding new item with payload:', payload);
      const response = await api.post('/api/shelves/add_item', payload);
      return { success: true, message: "Item added successfully" };
    } catch (error: any) {
      console.error('Debug - Full error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Debug - Response data:', error.response.data);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getUserShelves = useCallback(async (mediaType: keyof MediaTypeMapping) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        return [];
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const apiMediaType = mediaTypeMap[mediaType].toLowerCase();
      
      const response = await api.get(`/api/shelves/user/${apiMediaType}`);
      
      if (!response.data) {
        console.warn("No shelf data received");
        return [];
      }

      return response.data.map((shelf: any) => ({
        _id: shelf._id,
        name: shelf.name,
        items: shelf.items?.map((item: any) => ({
          id: item.media_id,
          title: item.title,
          cover_image: item.cover_image,
          creator: item.creator,
          added_at: item.added_at
        })) || []
      }));
    } catch (error) {
      console.error("Shelf fetch error:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const moveItem = async (
    mediaType: keyof MediaTypeMapping,
    itemId: string,
    newStatus: string
  ) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const apiMediaType = mediaTypeMap[mediaType];
      
      const payload = {
        media_type: apiMediaType,
        media_id: itemId,
        new_status: newStatus
        // Removed shelf_type as it's not expected by the backend
      };

      console.log('Moving item with payload:', payload);
      
      await api.post('/api/shelves/move_item', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Move item error:', err);
      setError('Failed to move item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeFromShelf = async (shelf: ShelfType, id: string) => {
    // ... existing code ...
  };

  const updateShelfItem = async (id: string, existingItem: ShelfItem) => {
    // ... existing code ...
  };

  return { addToShelf, getUserShelves, moveItem, loading, error };
}