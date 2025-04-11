import { useState } from "react";
import { toast } from "sonner";

// Utility function to normalize club cover image URLs
export const normalizeImageUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  
  // If it's already in the format we want, return it
  if (url.startsWith('/api/club_covers/')) {
    return url;
  }
  
  // If it has the old static path format
  if (url.includes('/static/club_covers/') || url.includes('/club_covers/')) {
    // Extract just the filename
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return `/api/club_covers/${filename}`;
  }
  
  // If it's a full URL (with localhost, etc)
  if (url.includes('localhost') && url.includes('/club_covers/')) {
    const matches = url.match(/\/club_covers\/([^?&]+)/);
    if (matches && matches[1]) {
      return `/api/club_covers/${matches[1]}`;
    }
  }
  
  // Fallback to the original URL
  return url;
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

  // Get auth headers for regular JSON requests
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };
  
  // For FormData requests (don't include Content-Type)
  const getFormDataHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const getClubs = async (
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

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
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
  };

  const getUserClubs = async (
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
  };

  const getCreatedClubs = async (
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
  };

  const uploadCoverImage = async (file: File): Promise<string | null> => {
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

      // Format the URL consistently
      const imageUrl = `/api/club_covers/${data.url.split('/').pop()}`;
      
      console.log("Image uploaded successfully. URL:", imageUrl);
      return imageUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload image";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createClub = async (
    name: string,
    mediaType: string,
    description?: string,
    isPrivate?: boolean,
    coverImage?: File,
    bookTitle?: string,
    bookAuthor?: string,
    bookCover?: File,
    bookId?: string,
    bookCoverUrl?: string
  ) => {
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!name) {
      setError("Club name is required");
      return { success: false, message: "Club name is required" };
    }

    if (!mediaType) {
      setError("Media type is required");
      return { success: false, message: "Media type is required" };
    }

    const requestData: any = {
      name,
      media_type: mediaType,
    };

    if (description) {
      requestData.description = description;
    }

    if (isPrivate !== undefined) {
      requestData.is_private = isPrivate;
    }

    if (coverImage) {
      // If there's a cover image, we need to upload it first
      const formData = new FormData();
      formData.append("file", coverImage);
      const uploadResponse = await fetch("/api/clubs/upload-cover", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.detail || "Failed to upload cover image");
      }
      
      const { url } = await uploadResponse.json();
      requestData.cover_image = url;
    }

    // Only add book info if at least the title is provided
    if (bookTitle) {
      requestData.book_title = bookTitle;
      
      if (bookAuthor) {
        requestData.book_author = bookAuthor;
      }

      if (bookId) {
        requestData.book_id = bookId;
      }

      if (bookCoverUrl) {
        requestData.book_cover = bookCoverUrl;
      }
      
      if (bookCover) {
        // If there's a book cover, upload it first
        const formData = new FormData();
        formData.append("file", bookCover);
        const uploadResponse = await fetch("/api/clubs/upload-cover", {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.detail || "Failed to upload book cover");
        }
        
        const { url } = await uploadResponse.json();
        requestData.book_cover = url;
      }
    }

    try {
      const response = await fetch("/api/clubs/create", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to create club");
        return { success: false, message: data.detail };
      }

      // Show success message
      toast.success("Club created successfully!");

      // Return the club data for redirection
      return { 
        success: true, 
        data,
        clubId: data.id // Make sure we return the club ID
      };
    } catch (err) {
      setError("Error creating club");
      console.error("Error creating club:", err);
      return { success: false, message: "Network error" };
    } finally {
      setLoading(false);
    }
  };

  const joinClub = async (clubId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clubs/${clubId}/join`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to join club");
      }

      toast.success("Successfully joined club!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join club";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const leaveClub = async (clubId: string): Promise<boolean> => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const deleteClub = async (clubId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Attempting to delete club: ${clubId}`);
      
      const response = await fetch(`/api/clubs/${clubId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();
      console.log(`Delete club response:`, {
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok) {
        throw new Error(data.detail || "Failed to delete club");
      }

      toast.success("Club deleted successfully!");
      return true;
    } catch (err) {
      console.error("Error deleting club:", err);
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
      const response = await fetch(`/api/clubs/${clubId}/threads`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          description
        }),
      });

      const data = await response.json();

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
      const response = await fetch(`/api/clubs/${clubId}/threads`, {
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

  const updateClubBook = async (
    clubId: string,
    bookId: string,
    bookTitle: string,
    bookAuthor: string,
    bookCover?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clubs/${clubId}/book`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          book_id: bookId,
          book_title: bookTitle,
          book_author: bookAuthor,
          book_cover: bookCover,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to update club book");
        return { success: false, data: null };
      }

      return { success: true, data };
    } catch (err) {
      setError("Error updating club book");
      console.error("Error updating club book:", err);
      return { success: false, data: null };
    } finally {
      setLoading(false);
    }
  };

  // Return all the functions and state
  return {
    loading,
    error,
    getClubs,
    getUserClubs,
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
  };
}