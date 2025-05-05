// lib/api.ts
/**
 * This file sets up a centralized API client for communicating with the backend.
 * It handles:
 * 1. Setting up Axios with the correct base URL
 * 2. Automatically attaching authentication tokens to requests
 * 3. Handling token refresh when authentication expires
 * 4. Providing API functions for various data needs throughout the app
 */
import axios from 'axios';

// Get the API base URL from environment variable with a fallback for local development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Create a central Axios instance that will be used for all API requests.
 * This gives us a consistent configuration and behavior across the app.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
})

/**
 * Request Interceptor: This runs before every request is sent.
 * It automatically adds the authentication token to the request headers if available.
 * This saves us from manually adding the token to every API call.
 */
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage (where we store it after login)
    const token = localStorage.getItem('token')
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Response Interceptor: This handles token refresh when authentication expires.
 * If a request fails with a 401 Unauthorized error, it will:
 * 1. Try to refresh the token using the refresh token
 * 2. Queue any requests that failed during the refresh process
 * 3. Retry the failed requests with the new token when refresh succeeds
 * 4. Log the user out if refresh fails
 */

// Flag to track if a token refresh is already in progress
let isRefreshing = false;

// Interface for queued requests waiting for token refresh
interface QueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}

// Queue to hold requests that arrived during token refresh
let failedQueue: QueueItem[] = [];

/**
 * Process the queue of requests that were waiting for a token refresh
 * Either resolves them with the new token or rejects them all with an error
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  // Clear the queue after processing
  failedQueue = []
}

// Handle authentication errors and token refresh
api.interceptors.response.use(
  (response) => response, // Just return successful responses unchanged
  async (error) => {
    const originalRequest = error.config
    
    // If error is 401 (Unauthorized) and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we're already in the process of refreshing, queue this request
      if (isRefreshing) {
        // Create a new promise that will be resolved when the token is refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          // When resolved, update the auth header and retry the request
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }
      
      // Mark that we're now trying to refresh the token
      originalRequest._retry = true
      isRefreshing = true
      
      // Try to refresh the token
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        
        if (!refreshToken) {
          // No refresh token available, so we can't refresh - force logout
          console.error("Refresh Token not found. Logging out.");
          processQueue(new Error("Refresh token not found."), null);
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          if (typeof window !== 'undefined') window.location.href = '/auth/sign-in'
          return Promise.reject(new Error("Refresh token not found."))
        }
        
        console.log("Attempting token refresh...");
        // Use a basic axios instance for the refresh call to avoid interceptor loops
        const refreshAxios = axios.create({ baseURL: API_BASE_URL });
        const response = await refreshAxios.post(
           '/api/auth/refresh-token', 
           null, // No request body needed
           { // Add headers with the refresh token
               headers: {
                   'Authorization': `Bearer ${refreshToken}`
               }
           }
        );

        // If successful, update tokens in localStorage
        if (response.data.access_token) {
          console.log("Token refresh successful.");
          const newAccessToken = response.data.access_token;
          localStorage.setItem('token', newAccessToken);

          // Update default header for future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

          // Process all queued requests with the new token
          processQueue(null, newAccessToken)

          // Update the original request's header with the new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

          // Reset refreshing flag AFTER processing queue and setting header
          isRefreshing = false

          // Retry the original request with the new token
          return api(originalRequest)
        } else {
          // Unexpected response from refresh endpoint
          console.error("Token refresh failed: Invalid response format.");
          processQueue(new Error("Token refresh failed: Invalid response format."), null);
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          if (typeof window !== 'undefined') window.location.href = '/auth/sign-in'
          return Promise.reject(new Error("Token refresh failed: Invalid response format."))
        }
      } catch (refreshError: any) {
        // Refresh attempt failed (e.g., refresh token invalid/expired)
        console.error("Token refresh failed:", refreshError?.response?.data?.detail || refreshError);
        processQueue(refreshError, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        if (typeof window !== 'undefined') window.location.href = '/auth/sign-in'
        return Promise.reject(refreshError)
      }
    }
    
    // For other errors or if it was already a retry, just reject with the original error
    return Promise.reject(error)
  }
)

// Default export for convenience
export default api

/**
 * Media Search API Functions
 * These functions wrap API calls related to searching and retrieving media items.
 * Each handles errors consistently and provides typed return values.
 */

/**
 * Search for media (books, movies, TV shows) by query string
 * @param query The search term
 * @param mediaType Optional filter by media type (book, movie, tv)
 * @param page Page number for pagination (defaults to 1)
 * @returns Search results from the API
 */
export const searchMedia = async (query: string, mediaType?: string, page: number = 1) => {
  try {
      // Create a params object for axios
      const paramsObject: { query: string; media_type?: string; page: string } = {
          query: query,
          page: page.toString(),
      };
      if (mediaType) {
          paramsObject.media_type = mediaType;
      }

      // Use relative path and params object with the configured api instance
      const path = '/media/search';
      const response = await api.get(path, { params: paramsObject });
      return response.data;

  } catch (error: any) { 
      console.error('Search API error:', error);
      // Extract detail from FastAPI/Axios error structure, fallback to message
      const detail = error.response?.data?.detail || error.message || "Failed to perform search.";
      throw new Error(detail);
  }
};

/**
 * Get detailed information about a specific movie
 * @param movieId The TMDB ID of the movie
 * @returns Detailed movie information including credits and similar movies
 */
export const getMovieDetails = async (movieId: number) => {
  try {
    const path = `/media/movies/${movieId}`;
    const response = await api.get(path);
    return response.data;
  } catch (error: any) {
    console.error('Movie details error:', error);
    const detail = error.response?.data?.detail || error.message || "Failed to fetch movie details.";
    throw new Error(detail);
  }
};

/**
 * Get detailed information about a specific TV show
 * @param tvId The TMDB ID of the TV show
 * @returns Detailed TV show information including credits and similar shows
 */
export const getTVDetails = async (tvId: number) => {
  try {
    const path = `/media/tv/${tvId}`;
    const response = await api.get(path);
    return response.data;
  } catch (error: any) {
    console.error('[TV Details Frontend] Error:', error);
    const detail = error.response?.data?.detail || error.message || "Failed to fetch TV show details.";
    throw new Error(detail);
  }
};

/**
 * Get detailed information about a specific book
 * @param id The Google Books ID of the book
 * @returns Detailed book information
 */
export const getBookDetails = async (id: string) => {
  try {
    const path = `/media/books/${id}`;
    const response = await api.get(path);
    return response.data;
  } catch (error: any) {
    console.error('Book details error:', error);
    const detail = error.response?.data?.detail || error.message || "Failed to fetch book details.";
    throw new Error(detail);
  }
};

/**
 * Perform a quick search across all media types
 * Returns limited results from each media type for UI display
 * @param query The search term
 * @returns Object containing arrays of movies, TV shows, books, and articles
 */
export const searchQuick = async (query: string) => {
  const emptyResults = {
    movies: [],
    tv_shows: [],
    books: [],
    articles: []
  };

  try {
    const path = `/media/search/quick`;
    const response = await api.get(path, { params: { query } });
    return response.data;
  } catch (error: any) {
    console.error('[Quick Search] Error:', error);
    // Return empty results on error to prevent UI breakage
    return emptyResults;
  }
};

/**
 * Get detailed information about a specific article
 * @param articleId The ID of the article
 * @returns Detailed article information
 */
export const getArticleDetails = async (articleId: string) => {
  try {
    const path = `/media/article/${articleId}`;
    const response = await api.get(path);
    return response.data;
  } catch (error: any) {
    console.error("[Frontend] Error fetching article details:", error);
    const detail = error.response?.data?.detail || error.message || "Failed to fetch article details.";
    throw new Error(detail);
  }
};

/**
 * Check if the user is currently authenticated
 * Used for conditional rendering and protected routes
 * @returns Boolean indicating authentication status
 */
export const checkAuth = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false
    
    // Try to get the user profile - this will fail if the token is invalid
    const response = await api.get('/api/auth/me') 
    return response.status === 200
  } catch (error) {
    return false
  }
}

/**
 * Explore/Discovery API Functions
 * These functions retrieve curated content for the explore pages
 */

/**
 * Get trending media across all types or filtered by type
 * @param tab Filter by media type (All, Movies, TV, Books, Articles)
 * @param options Optional filtering parameters
 * @returns List of trending media items
 */
export async function getTrendingMedia(
  tab: string = "All",
  options?: {
    minRating?: number,
    maxRating?: number,
    page?: number,
    limit?: number
  }
) {
  const defaultResponse = { results: [] };
  try {
    // Build query parameters
    const params = new URLSearchParams({
      tab: tab
    });

    // Add optional filters if provided
    if (options?.minRating) params.append('min_rating', options.minRating.toString());
    if (options?.maxRating) params.append('max_rating', options.maxRating.toString());
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const path = `/media/explore/trending`;
    const response = await api.get(path, { params });
    return response.data;

  } catch (error: any) {
    console.error("Failed to fetch trending media:", error);
    // Return empty results on error to prevent UI breakage
    return defaultResponse;
  }
}

/**
 * Get new releases across all media types or filtered by type
 * @param tab Filter by media type (All, Movies, TV, Books, Articles)
 * @param options Optional filtering parameters including date range
 * @returns List of new release media items
 */
export async function getNewReleases(
  tab: string = "All",
  options?: {
    minRating?: number,
    maxRating?: number,
    fromDate?: string,
    toDate?: string,
    page?: number,
    limit?: number
  }
) {
  const defaultResponse = { results: [] };
  try {
    // Build query parameters
    const params = new URLSearchParams({
      tab: tab
    });

    // Add optional filters if provided
    if (options?.minRating) params.append('min_rating', options.minRating.toString());
    if (options?.maxRating) params.append('max_rating', options.maxRating.toString());
    if (options?.fromDate) params.append('from_date', options.fromDate);
    if (options?.toDate) params.append('to_date', options.toDate);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const path = `/media/explore/new-releases`;
    const response = await api.get(path, { params });
    return response.data;

  } catch (error: any) {
    console.error("Failed to fetch new releases:", error);
    // Return empty results on error to prevent UI breakage
    return defaultResponse;
  }
}

/**
 * Get media by category (genre, subject, etc.)
 * @param category The category ID or name to filter by
 * @param tab Filter by media type (All, Movies, TV, Books, Articles)
 * @param options Optional filtering parameters
 * @returns List of media items in the specified category
 */
export async function getCategoryMedia(
  category: string,
  tab: string = "All",
  options?: {
    minRating?: number,
    maxRating?: number,
    page?: number,
    limit?: number
  }
) {
  const defaultResponse = { results: [] };
  try {
    // Build query parameters
    const params = new URLSearchParams({
      tab: tab
    });

    // Add optional filters if provided
    if (options?.minRating) params.append('min_rating', options.minRating.toString());
    if (options?.maxRating) params.append('max_rating', options.maxRating.toString());
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const path = `/media/explore/category/${category}`;
    const response = await api.get(path, { params });
    return response.data;

  } catch (error: any) {
    console.error(`Failed to fetch ${category} media:`, error);
    // Return empty results on error to prevent UI breakage
    return defaultResponse;
  }
}