import { useState, useCallback } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { api } from '@/lib/api';
import { useAuth } from '@/lib/context/AuthContext';
import axios from 'axios';

// Utility function to normalize club cover image URLs
export const normalizeImageUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  
  // Check if it's already an absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's just the relative path (e.g., /club_covers/filename.jpg)
  if (url.startsWith('/club_covers/')) {
    return `${API_BASE_URL}${url}`; // Prepend the backend base URL
  }
  
  // If it includes /static/ or just the filename part from older formats
  if (url.includes('/static/club_covers/') || url.includes('/club_covers/')) {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return `${API_BASE_URL}/club_covers/${filename}`; // Construct full backend URL
  }
  
  // Try to extract filename if it somehow ended up different
  const filenameMatch = url.match(/[^/]+$/);
  if (filenameMatch) {
     return `${API_BASE_URL}/club_covers/${filenameMatch[0]}`;
  }

  // Fallback if we can't parse it
  console.warn(`[normalizeImageUrl] Could not normalize URL: ${url}`);
  return url; // Return original or undefined if it's truly unparseable
};

export interface ClubData {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  creator_username: string;
  member_count: number;
  media_type: string;
  is_private: boolean;
  created_at: string;
  is_member: boolean;
  is_creator: boolean;
  cover_image?: string;
  book_title?: string;
  book_author?: string;
  book_cover?: string;
  movie_title?: string;
  movie_director?: string;
  movie_year?: number;
  movie_poster?: string;
  movie_id?: string;
  tv_title?: string;
  tv_creator?: string;
  tv_year?: number;
  tv_poster?: string;
  tv_id?: string;
  tv_season?: number;
  tv_episode?: number;
}

export interface ClubPostData {
  id: string;
  content: string;
  author_id: string;
  author_username: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  is_edited: boolean;
}

export interface ClubMilestoneData {
  id: string;
  title: string;
  description?: string;
  milestone_date: string;
  creator_id: string;
  creator_username: string;
  created_at: string;
}

export interface ClubThreadData {
  id: string;
  title: string;
  thread_type: string;
  chapter_number?: number;
  order: number;
  creator_id: string;
  creator_username: string;
  created_at: string;
}

interface ClubResponse {
  success: boolean;
  message?: string;
  data?: {
    clubs?: ClubData[];
    total?: number;
  };
}

interface ClubPostResponse {
  success: boolean;
  message?: string;
  data?: {
    posts?: ClubPostData[];
    total?: number;
  };
}

interface ClubMilestoneResponse {
  success: boolean;
  message?: string;
  data?: {
    milestones?: ClubMilestoneData[];
    total?: number;
  };
}

interface ClubThreadResponse {
  success: boolean;
  message?: string;
  data?: {
    threads?: ClubThreadData[];
    total?: number;
  };
}

export function useClubs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState<Record<string, boolean>>({});
  const { isAuthenticated } = useAuth();

  const getClubs = useCallback(async (
    skip = 0,
    limit = 20,
    mediaType?: string,
    search?: string,
    clubId?: string
  ): Promise<ClubResponse> => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        skip,
        limit,
        ...(mediaType && { media_type: mediaType }),
        ...(search && { search }),
      };

      const url = clubId ? `/api/clubs/${clubId}` : `/api/clubs`;

      console.log(`[getClubs] Fetching URL: ${url} with params:`, params);

      const response = await api.get(url, { params });

      console.log(`[getClubs] Response Status for ${url}:`, response.status);
      const data = response.data;

      let clubs = clubId ? [data] : data;
      
      clubs = clubs.map((club: any) => ({
        ...club,
        cover_image: normalizeImageUrl(club.cover_image)
      }));

      return {
        success: true,
        data: {
          clubs,
          total: clubs.length,
        },
      };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to fetch clubs");
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserClubs = useCallback(async (
    skip = 0,
    limit = 20
  ): Promise<ClubResponse> => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      return { success: false, message: "Authentication required to fetch your clubs" };
    }

    try {
      const params = { skip, limit };
      const response = await api.get(`/api/clubs/user`, { params });
      const data = response.data;

      const clubs = data.map((club: any) => ({
        ...club,
        cover_image: normalizeImageUrl(club.cover_image),
      }));

      return {
        success: true,
        data: {
          clubs,
          total: clubs.length,
        },
      };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to fetch user clubs");
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const getMyClubs = useCallback(async (
    skip = 0,
    limit = 20
  ): Promise<ClubResponse> => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      return { success: false, message: "Authentication required to fetch your clubs" };
    }

    try {
      const params = { skip, limit };
      const response = await api.get(`/api/clubs/my`, { params });
      const data = response.data;

      const clubs = data.map((club: any) => ({
        ...club,
        cover_image: normalizeImageUrl(club.cover_image),
      }));

      return {
        success: true,
        data: {
          clubs,
          total: clubs.length,
        },
      };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to fetch my clubs");
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const getCreatedClubs = useCallback(async (
    skip = 0,
    limit = 20
  ): Promise<ClubResponse> => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      return { success: false, message: "Authentication required to fetch created clubs" };
    }

    try {
      const params = { skip, limit };
      const response = await api.get(`/api/clubs/created`, { params });
      const data = response.data;

      const clubs = data.map((club: any) => ({
        ...club,
        cover_image: normalizeImageUrl(club.cover_image),
      }));

      return {
        success: true,
        data: {
          clubs,
          total: clubs.length,
        },
      };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to fetch created clubs");
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const uploadCoverImage = useCallback(async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      toast.error("Authentication required to upload images.");
      setLoading(false);
      return null;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
          "/api/clubs/upload-cover", 
          formData,
          {
              headers: {
                  'Content-Type': 'multipart/form-data' 
              }
          }
      );

      const data = response.data;
      const relativePath = data.url;
      if (!relativePath || typeof relativePath !== 'string' || !relativePath.startsWith('/club_covers/')) {
          console.error("[uploadCoverImage] Backend did not return a valid relative path in 'url' field:", data);
          throw new Error("Invalid response from image upload endpoint.");
      }
      console.log("Image uploaded successfully. Relative Path:", relativePath);
      return relativePath;
    } catch (err: any) {
      let errorMessage = "Failed to upload image";
      if (err.response?.data?.detail) {
          const detail = err.response.data.detail;
          errorMessage = (typeof detail === 'object') ? JSON.stringify(detail) : String(detail);
      } else if (err instanceof Error) {
          errorMessage = err.message;
      }
      console.error("[Upload Cover Image] Error:", errorMessage, "Raw Error:", err);
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createClub = useCallback(async (
    name: string,
    mediaType: string,
    description?: string,
    isPrivate?: boolean,
    coverImage?: File
  ) => {
    console.log("[Frontend] Starting club creation with data:", {
      name,
      mediaType,
      description,
      isPrivate,
      hasCoverImage: !!coverImage
    });
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
        toast.error("Authentication required to create clubs.");
        setError("Authentication required");
        setLoading(false);
        return { success: false, message: "Authentication required" };
    }

    if (!name) {
      console.log("[Frontend] Validation failed: Club name is required");
      setError("Club name is required");
      setLoading(false);
      return { success: false, message: "Club name is required" };
    }

    if (!mediaType) {
      console.log("[Frontend] Validation failed: Media type is required");
      setError("Media type is required");
      setLoading(false);
      return { success: false, message: "Media type is required" };
    }

    const requestData: any = {
      name,
      media_type: mediaType,
      ...(description && { description }),
      is_private: !!isPrivate,
    };

    console.log("[Frontend] Prepared initial request data:", requestData);

    if (coverImage) {
      try {
        const relativePath = await uploadCoverImage(coverImage);
        if (relativePath) {
          requestData.cover_image = relativePath;
        } else {
          console.error("[Frontend] Failed to upload cover image: Image upload returned null");
        }
      } catch (err) {
        console.error("[Frontend] Failed to upload cover image:", err);
      }
    }

    try {
      console.log("[Frontend] Sending club creation request via api instance:", requestData);
      const response = await api.post("/api/clubs/create", requestData);

      console.log("[Frontend] Club creation response status:", response.status);
      const data = response.data;
      console.log("[Frontend] Club creation response data:", data);

      toast.success("Club created successfully!");
      setError(null);
      return { success: true, data, clubId: data.id };
    } catch (err: any) {
      // --- Simplified Error Handling for Debugging --- 
      const simpleErrorMessage = "Failed to create club.";
      console.error("[Frontend] Club creation failed:", simpleErrorMessage, "Raw error:", err.response?.data || err);
      setError(simpleErrorMessage);
      toast.error(simpleErrorMessage);
      // --- End Simplified --- 
      return { success: false, message: simpleErrorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, uploadCoverImage]);

  const joinClub = useCallback(async (clubId: string): Promise<{ success: boolean; message?: string }> => {
    setInternalLoading(prev => ({ ...prev, [clubId]: true }));
    setError(null);

    if (!isAuthenticated) {
      toast.error("Please sign in to join clubs.");
      setInternalLoading(prev => ({ ...prev, [clubId]: false }));
      return { success: false, message: "Authentication required" };
    }

    try {
      const response = await api.post(`/api/clubs/${clubId}/join`);
      toast.success(response.data.message || "Successfully joined club!");
      return { success: true, message: response.data.message };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to join club");
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
       setInternalLoading(prev => ({ ...prev, [clubId]: false }));
    }
  }, [isAuthenticated]);

  const leaveClub = useCallback(async (clubId: string): Promise<{ success: boolean; message?: string }> => {
     setInternalLoading(prev => ({ ...prev, [clubId]: true }));
    setError(null);

    if (!isAuthenticated) {
      toast.error("Please sign in to leave clubs.");
       setInternalLoading(prev => ({ ...prev, [clubId]: false }));
      return { success: false, message: "Authentication required" };
    }

    try {
      const response = await api.post(`/api/clubs/${clubId}/leave`);
      toast.success(response.data.message || "Successfully left club.");
      return { success: true, message: response.data.message };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to leave club");
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
       setInternalLoading(prev => ({ ...prev, [clubId]: false }));
    }
  }, [isAuthenticated]);

  const deleteClub = useCallback(async (clubId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      toast.error("Authentication required to delete clubs.");
      setLoading(false);
      return false;
    }

    try {
      await api.delete(`/api/clubs/${clubId}`);
      toast.success("Club deleted successfully");
      return true;
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to delete club");
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createPost = useCallback(async (
    clubId: string,
    content: string
  ): Promise<ClubPostResponse> => {
     setLoading(true);
    setError(null);

     if (!isAuthenticated) {
      toast.error("Authentication required to create posts.");
      setLoading(false);
      return { success: false, message: "Authentication required" };
    }

    try {
      const response = await api.post(`/api/clubs/${clubId}/posts`, { content });
      toast.success("Post created");
      return { success: true, data: { posts: [response.data] } };
    } catch (err: any) {
       const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to create post");
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const getClubPosts = useCallback(async (
    clubId: string,
    skip = 0,
    limit = 20
  ): Promise<ClubPostResponse> => {
    setLoading(true);
    setError(null);

    try {
      const params = { skip, limit };
      const response = await api.get(`/api/clubs/${clubId}/posts`, { params });
      return { success: true, data: response.data };
    } catch (err: any) {
       const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to fetch posts");
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);
  
  const createMilestone = useCallback(async (
    clubId: string,
    title: string,
    milestoneDate: Date,
    description?: string
  ): Promise<ClubMilestoneResponse> => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      toast.error("Authentication required to add milestones.");
      setLoading(false);
      return { success: false, message: "Authentication required" };
    }

    try {
        const payload = { title, description, milestone_date: milestoneDate.toISOString() };
        const response = await api.post(`/api/clubs/${clubId}/milestones`, payload);
        toast.success("Milestone added");
        return { success: true, data: { milestones: [response.data] } };
    } catch (err: any) {
        const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to add milestone");
        setError(message);
        toast.error(message);
        return { success: false, message };
    } finally {
        setLoading(false);
    }
  }, [isAuthenticated]);

  const getClubMilestones = useCallback(async (
    clubId: string
  ): Promise<ClubMilestoneResponse> => {
    setLoading(true);
    setError(null);

    try {
        const response = await api.get(`/api/clubs/${clubId}/milestones`);
        return { success: true, data: response.data };
    } catch (err: any) {
       const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to fetch milestones");
        setError(message);
        return { success: false, message };
    } finally {
        setLoading(false);
    }
  }, []);

  const createThread = useCallback(async (
    clubId: string,
    title: string,
    description?: string
  ): Promise<ClubThreadResponse> => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      toast.error("Authentication required to create threads.");
      setLoading(false);
      return { success: false, message: "Authentication required" };
    }
    try {
        const payload = { title, description };
        const response = await api.post(`/api/clubs/${clubId}/threads`, payload);
        toast.success("Thread created");
        return { success: true, data: { threads: [response.data] } };
    } catch (err: any) {
        const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to create thread");
        setError(message);
        toast.error(message);
        return { success: false, message };
    } finally {
        setLoading(false);
    }
  }, [isAuthenticated]);

  const getClubThreads = useCallback(async (
    clubId: string
  ): Promise<ClubThreadResponse> => {
    setLoading(true);
    setError(null);

    try {
        const response = await api.get(`/api/clubs/${clubId}/threads`);
        return { success: true, data: response.data };
    } catch (err: any) {
       const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to fetch threads");
        setError(message);
        return { success: false, message };
    } finally {
        setLoading(false);
    }
  }, []);

  const updateClubBook = useCallback(async (clubId: string, bookData: {
    book_id: string;
    book_title: string;
    book_author: string;
    book_cover: string;
  }): Promise<{ success: boolean; message?: string; data?: ClubData }> => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      toast.error("Authentication required to update club media.");
      setLoading(false);
      return { success: false, message: "Authentication required" };
    }
    try {
      const response = await api.put(`/api/clubs/${clubId}/book`, bookData);
      toast.success("Club book updated");
      return { success: true, data: response.data };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to update club book");
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const updateClubMovie = useCallback(async (clubId: string, movieData: {
    movie_id: string;
    movie_title: string;
    movie_director?: string;
    movie_poster?: string;
    movie_year?: number;
  }): Promise<{ success: boolean; message?: string; data?: ClubData }> => {
    setLoading(true);
    setError(null);
    if (!isAuthenticated) {
      toast.error("Authentication required to update club media.");
      setLoading(false);
      return { success: false, message: "Authentication required" };
    }
    try {
      const response = await api.put(`/api/clubs/${clubId}/movie`, movieData);
      toast.success("Club movie updated");
      return { success: true, data: response.data };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to update club movie");
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const updateClubTVShow = useCallback(async (clubId: string, tvShowData: {
    tv_id: string;
    tv_title: string;
    tv_creator?: string;
    tv_poster?: string;
    tv_year?: number;
    tv_season?: number;
    tv_episode?: number;
  }): Promise<{ success: boolean; message?: string; data?: ClubData }> => {
    setLoading(true);
    setError(null);
    if (!isAuthenticated) {
      toast.error("Authentication required to update club media.");
      setLoading(false);
      return { success: false, message: "Authentication required" };
    }
    try {
      const response = await api.put(`/api/clubs/${clubId}/tv-show`, tvShowData);
      toast.success("Club TV show updated");
      return { success: true, data: response.data };
    } catch (err: any) {
      const message = err.response?.data?.detail || (err instanceof Error ? err.message : "Failed to update club TV show");
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  return {
    loading,
    error,
    internalLoading,
    getClubs,
    getUserClubs,
    getMyClubs,
    getCreatedClubs,
    createClub,
    joinClub,
    leaveClub,
    deleteClub,
    createPost,
    getClubPosts,
    uploadCoverImage,
    createMilestone,
    getClubMilestones,
    createThread,
    getClubThreads,
    updateClubBook,
    updateClubMovie,
    updateClubTVShow,
  };
}