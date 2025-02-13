import { useState, useCallback, useEffect } from 'react';
import api from '@/lib/api';
import axios from 'axios';
import { API_BASE_URL } from '../config';

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

export function useShelf(mediaType?: string) {
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeShelves = async () => {
    try {
      await api.post('/api/shelves/create_default');
    } catch (err) {
      console.error('Failed to initialize shelves:', err);
    }
  };

  const fetchShelves = useCallback(async () => {
    if (!mediaType) return;
    
    try {
      setLoading(true);
      console.log('Fetching shelves for media type:', mediaType);
      const response = await axios.get(
        `${API_BASE_URL}/api/shelves/user/${mediaType}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      console.log('Shelves response:', response.data);
      setShelves(response.data);
    } catch (err) {
      console.error('Error fetching shelves:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch shelves');
    } finally {
      setLoading(false);
    }
  }, [mediaType]);

  useEffect(() => {
    if (mediaType) {
      fetchShelves();
    }
  }, [mediaType, fetchShelves]);

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

      const shelves = await getUserShelves(mediaType);
      const shelfType = getShelfType(mediaType, status);
      
      const targetShelf = shelves.find((shelf: Shelf) => 
        shelf.name.toLowerCase() === shelfType.replace(/_/g, ' ').toLowerCase()
      );

      const itemExists = targetShelf?.items?.some((existingItem: ShelfItem) => 
        existingItem.media_id === item.id
      );

      if (itemExists) {
        return { success: false, message: "Item already exists in this shelf" };
      }

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

      await api.post('/api/shelves/add_item', payload);
      await fetchShelves();
      return { success: true, message: "Item added successfully" };
    } catch (error: any) {
      console.error('Add to shelf error:', error);
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

      const apiMediaType = mediaTypeMap[mediaType].toLowerCase();
      const response = await api.get<Shelf[]>(`/api/shelves/user/${apiMediaType}`);
      
      if (!response.data) {
        console.warn("No shelf data received");
        return [];
      }

      return response.data;
    } catch (error) {
      console.error("Shelf fetch error:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    shelves, 
    loading, 
    error, 
    initializeShelves, 
    addToShelf, 
    getUserShelves,
    fetchShelves 
  };
}