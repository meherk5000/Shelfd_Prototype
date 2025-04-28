import { useState, useCallback } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";

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
  const [internalLoading, setInternalLoading] = useState<Record<string, boolean>>({}); // For join/leave

  // Memoize getAuthHeaders
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }, []); // Empty dependency array: doesn't depend on component state/props

  // Memoize getFormDataHeaders
  const getFormDataHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  }, []); // Empty dependency array

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
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        ...(mediaType && { media_type: mediaType }),
        ...(search && { search }),
      });

      const url = clubId
        ? `/api/clubs/${clubId}`
        : `/api/clubs?${params}`;

      // Always get headers using getAuthHeaders - it conditionally adds Authorization based on token presence
      const headers = getAuthHeaders();

      console.log(`[getClubs] Fetching URL: ${url} with headers:`, headers); 

      const response = await fetch(url, {
        headers: headers, // Use the headers from getAuthHeaders
      });
      console.log(`[getClubs] Response Status for ${url}:`, response.status); 
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch clubs");
      }

      // If fetching a specific club, wrap it in an array
      let clubs = clubId ? [data] : data;
      
      // Normalize all image URLs
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch clubs";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]); // Dependency: getAuthHeaders

  const getUserClubs = useCallback(async (
    skip = 0,
    limit = 20
  ): Promise<ClubResponse> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/clubs/user?${params}`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch user clubs");
      }

      // Normalize all image URLs
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch user clubs";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]); // Dependency: getAuthHeaders

  const getMyClubs = useCallback(async (
    skip = 0,
    limit = 20
  ): Promise<ClubResponse> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });

      // Fetch from the /api/clubs/my endpoint
      const response = await fetch(`/api/clubs/my?${params}`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch my clubs");
      }

      // Normalize all image URLs
      const clubs = data.map((club: any) => ({
        ...club,
        cover_image: normalizeImageUrl(club.cover_image),
      }));

      return {
        success: true,
        data: {
          clubs,
          // Note: The backend /my endpoint currently doesn't return a total count
          // for pagination purposes after deduplication. We might need to adjust
          // the backend later if precise total count is needed for pagination UI.
          total: clubs.length, 
        },
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch my clubs";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]); // Dependency: getAuthHeaders

  const getCreatedClubs = useCallback(async (
    skip = 0,
    limit = 20
  ): Promise<ClubResponse> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/clubs/created?${params}`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch created clubs");
      }

      // Normalize all image URLs
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch created clubs";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]); // Dependency: getAuthHeaders

  const uploadCoverImage = useCallback(async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/clubs/upload-cover", {
        method: "POST",
        headers: {
          // Don't set Content-Type here, let the browser set it with the boundary
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to upload image");
      }

      // Return the full URL directly from the backend if possible, or normalize
      // The backend's response `data.url` should be the relative path like '/club_covers/...'
      const relativePath = data.url; // Assuming backend returns '/club_covers/filename.jpg'
      const imageUrl = normalizeImageUrl(relativePath); // Use the updated normalizer

      console.log("Image uploaded successfully. Full URL:", imageUrl);
      return imageUrl || null; // Return the full URL or null if normalization failed
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload image";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [normalizeImageUrl]); // Dependency: normalizeImageUrl (if it's stable)

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

    // Validate required fields
    if (!name) {
      console.log("[Frontend] Validation failed: Club name is required");
      setError("Club name is required");
      return { success: false, message: "Club name is required" };
    }

    if (!mediaType) {
      console.log("[Frontend] Validation failed: Media type is required");
      setError("Media type is required");
      return { success: false, message: "Media type is required" };
    }

    const requestData: any = {
      name,
      media_type: mediaType,
      ...(description && { description }),
      is_private: isPrivate,
    };

    console.log("[Frontend] Prepared initial request data:", requestData);

    // Handle cover image upload if provided
    if (coverImage) {
      try {
        const imageUrl = await uploadCoverImage(coverImage);
        if (imageUrl) {
          requestData.cover_image = imageUrl;
        }
      } catch (err) {
        console.error("[Frontend] Failed to upload cover image:", err);
        // Continue with club creation even if image upload fails
      }
    }

    try {
      console.log("[Frontend] Sending club creation request with data:", requestData);
      console.log("[Frontend] Headers being sent:", getAuthHeaders());

      const response = await fetch("/api/clubs/create", { 
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(requestData),
      });

      console.log("[Frontend] Club creation response status:", response.status);
      const data = await response.json();
      console.log("[Frontend] Club creation response data:", data);

      if (!response.ok) {
        const errorMessage = data.detail?.error || data.detail?.message || data.detail || "Failed to create club";
        console.error("[Frontend] Club creation failed:", errorMessage);
        setError(errorMessage);
        if (response.status === 422) {
            toast.error(`Failed to create club: ${errorMessage}`);
        } else {
            toast.error(errorMessage);
        }
        return { success: false, message: errorMessage };
      }

      console.log("[Frontend] Club created successfully:", data);
      toast.success("Club created successfully!");

      return { 
        success: true, 
        data,
        clubId: data.id
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create club";
      console.error("[Frontend] Unexpected error during club creation:", err);
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, uploadCoverImage]); // Dependencies

  const joinClub = useCallback(async (clubId: string): Promise<boolean> => {
    setInternalLoading(prev => ({ ...prev, [clubId]: true })); // Use specific loading state
    setError(null);

    try {
      console.log(`Attempting to join club: ${clubId}`);
      
      const response = await fetch(`/api/clubs/${clubId}/join`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();
      console.log(`Join club response:`, {
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok) {
        throw new Error(data.detail || "Failed to join club");
      }

      toast.success("Successfully joined club!");
      return true;
    } catch (err) {
      console.error("Error joining club:", err);
      const message = err instanceof Error ? err.message : "Failed to join club";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setInternalLoading(prev => ({ ...prev, [clubId]: false }));
    }
  }, [getAuthHeaders]); // Dependency

  const leaveClub = useCallback(async (clubId: string): Promise<boolean> => {
    setInternalLoading(prev => ({ ...prev, [clubId]: true })); // Use specific loading state
    setError(null);

    try {
      const response = await fetch(`/api/clubs/${clubId}/leave`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to leave club");
      }

      toast.success("Successfully left club!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to leave club";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setInternalLoading(prev => ({ ...prev, [clubId]: false }));
    }
  }, [getAuthHeaders]); // Dependency

  const deleteClub = async (clubId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clubs/${clubId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to delete club");
      }

      toast.success("Club deleted successfully!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete club";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (
    clubId: string,
    content: string
  ): Promise<ClubPostResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clubs/${clubId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create post");
      }

      toast.success("Post created successfully!");
      return { success: true, data: { posts: [data] } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create post";
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const getClubPosts = async (
    clubId: string,
    skip = 0,
    limit = 20
  ): Promise<ClubPostResponse> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/clubs/${clubId}/posts?${params}`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch posts");
      }

      return {
        success: true,
        data: {
          posts: data,
          total: data.length,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch posts";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };
  
  // Add functions for milestones and threads
  const createMilestone = async (
    clubId: string,
    title: string,
    milestoneDate: Date,
    description?: string
  ): Promise<ClubMilestoneResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clubs/${clubId}/milestones`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          description,
          milestone_date: milestoneDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create milestone");
      }

      toast.success("Milestone created successfully!");
      return { 
        success: true, 
        data: { 
          milestones: [data] 
        } 
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create milestone";
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const getClubMilestones = async (
    clubId: string
  ): Promise<ClubMilestoneResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clubs/${clubId}/milestones`, {
        headers: getAuthHeaders(),
      });

      // Improved error handling for non-OK responses
      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error("Error fetching milestones:", errorData);
          throw new Error(errorData.detail || `Failed to fetch milestones (${response.status})`);
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          throw new Error(`Failed to fetch milestones - Server returned ${response.status}`);
        }
      }

      const data = await response.json();

      return { 
        success: true, 
        data: { 
          milestones: data,
          total: data.length 
        } 
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch milestones";
      console.error("Error in getClubMilestones:", message);
      
      // Always return a success response with empty data to prevent UI breakage
      return { 
        success: true, 
        message,
        data: { 
          milestones: [],
          total: 0 
        } 
      };
    } finally {
      setLoading(false);
    }
  };

  const createThread = async (
    clubId: string,
    title: string,
    description?: string
  ): Promise<ClubThreadResponse> => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      console.log("Token from localStorage:", token);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE_URL}/api/clubs/${clubId}/threads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description
        }),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create thread");
      }

      toast.success("Thread created successfully!");
      return { 
        success: true, 
        data: { 
          threads: [data]
        } 
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create thread";
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const getClubThreads = async (
    clubId: string
  ): Promise<ClubThreadResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clubs/${clubId}/threads`, {
        headers: getAuthHeaders(),
      });

      // Improved error handling for non-OK responses
      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error("Error fetching threads:", errorData);
          throw new Error(errorData.detail || `Failed to fetch threads (${response.status})`);
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          throw new Error(`Failed to fetch threads - Server returned ${response.status}`);
        }
      }

      const data = await response.json();

      return { 
        success: true, 
        data: { 
          threads: data,
          total: data.length 
        } 
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch threads";
      console.error("Error in getClubThreads:", message);
      
      // Always return a success response with empty data to prevent UI breakage
      return { 
        success: true, 
        message,
        data: { 
          threads: [],
          total: 0 
        } 
      };
    } finally {
      setLoading(false);
    }
  };

  const updateClubBook = async (clubId: string, bookData: {
    book_id: string;
    book_title: string;
    book_author: string;
    book_cover: string;
  }): Promise<{ success: boolean; message?: string; data?: ClubData }> => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/clubs/${clubId}/book`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(bookData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update club book");
      }

      return { success: true, data };
    } catch (err) {
      console.error("Error updating club book:", err);
      return { 
        success: false, 
        message: err instanceof Error ? err.message : "Failed to update club book" 
      };
    } finally {
      setLoading(false);
    }
  };

  // Add update functions for Movie and TV Show
  const updateClubMovie = async (clubId: string, movieData: {
    movie_id: string;
    movie_title: string;
    movie_director?: string;
    movie_poster?: string;
    movie_year?: number;
  }): Promise<{ success: boolean; message?: string; data?: ClubData }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clubs/${clubId}/movie`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(movieData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to update club movie");
      }
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update club movie";
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const updateClubTVShow = async (clubId: string, tvShowData: {
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
    try {
      const response = await fetch(`/api/clubs/${clubId}/tv-show`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(tvShowData),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.detail?.message || data.detail || "Failed to update club TV show"; 
        console.error("Failed to update club TV show:", response.status, errorMessage);
        throw new Error(errorMessage);
      }
      return { success: true, data }; 
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update club TV show";
      setError(message);
      toast.error(`Failed to update club TV show: ${message}`); 
      return { success: false, message }; 
    } finally {
      setLoading(false);
    }
  };

  // Return all the functions and state
  return {
    loading,
    internalLoading,
    error,
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