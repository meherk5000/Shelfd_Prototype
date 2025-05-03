// lib/api.ts
// Revert to standard default import again
import axios from 'axios';

// Get the API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create an axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Add a request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('token')
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Add a response interceptor to handle token refresh
let isRefreshing = false;

interface QueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}

let failedQueue: QueueItem[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

// Handle authentication errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }
      
      // Mark as retrying
      originalRequest._retry = true
      isRefreshing = true
      
      // Try to refresh the token
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        
        if (!refreshToken) {
          // No refresh token, logout
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
           '/api/auth/refresh-token', // Correct backend path
           null, // No request body needed
           { // Add headers config
               headers: {
                   'Authorization': `Bearer ${refreshToken}`
               }
           }
        );

        // If successful, update tokens
        if (response.data.access_token) {
          console.log("Token refresh successful.");
          const newAccessToken = response.data.access_token;
          localStorage.setItem('token', newAccessToken);

          // Update default header for subsequent requests
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

          // Process the queue with the new token
          processQueue(null, newAccessToken)

          // Update the original request's header with the new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

          // Reset refreshing flag AFTER processing queue and setting header
          isRefreshing = false

          // Retry the original request using the main api instance
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
        // Refresh failed (e.g., refresh token invalid/expired -> 401 from /refresh)
        console.error("Token refresh failed:", refreshError?.response?.data?.detail || refreshError);
        processQueue(refreshError, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        if (typeof window !== 'undefined') window.location.href = '/auth/sign-in'
        return Promise.reject(refreshError)
      }
    }
    
    // For other error status codes or if it was already a retry, just reject
    return Promise.reject(error)
  }
)

export default api

export const searchMedia = async (query: string, mediaType?: string, page: number = 1) => {
  try {
      // Development/Debug Logging: console.log('Making API request with:', { query, mediaType, page });

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
      // Development/Debug Logging: console.log('Request Path:', path, 'Params:', paramsObject);

      // Use the configured axios instance 'api'
      const response = await api.get(path, { params: paramsObject });

      // Axios handles non-2xx and JSON parsing. Interceptors handle auth.

      // Development/Debug Logging: console.log('API response data:', response.data);
      return response.data;

  } catch (error: any) { // Catch potential Axios errors or interceptor errors
      console.error('Search API error:', error); // Log the error
      // Extract detail from FastAPI/Axios error structure, fallback to message
      const detail = error.response?.data?.detail || error.message || "Failed to perform search.";
      // Re-throw a standard error for the calling component to handle
      throw new Error(detail);
  }
};


export const getMovieDetails = async (movieId: number) => {
  try {
    // Development/Debug Logging: console.log('Fetching movie details for:', movieId);
    // Use relative path for the configured api instance
    const path = `/media/movies/${movieId}`;
    // Development/Debug Logging: console.log('Request Path:', path);

    // Use the configured axios instance 'api'
    const response = await api.get(path);

    // Axios automatically handles non-2xx errors & JSON parsing.
    // Interceptors on 'api' handle auth header and token refresh.

    // Development/Debug Logging: console.log('Movie details received:', response.data);
    // Return the data property from the axios response
    return response.data;

  } catch (error: any) { // Catch potential Axios errors or interceptor errors
    console.error('Movie details error:', error); // Log the error
    // Extract detail from FastAPI/Axios error structure, fallback to message
    const detail = error.response?.data?.detail || error.message || "Failed to fetch movie details.";
    // Re-throw a standard error for the calling component to handle
    throw new Error(detail);
  }
};


export const getTVDetails = async (tvId: number) => {
  try {
    // Use relative path for the configured api instance
    const path = `/media/tv/${tvId}`;
    // Development/Debug Logging: console.log('Request Path:', path);

    // Use the configured axios instance 'api'
    const response = await api.get(path);

    // Axios automatically handles non-2xx errors & JSON parsing.
    // Interceptors on 'api' handle auth header and token refresh.

    // Development/Debug Logging: console.log('TV details received:', response.data);
    // Return the data property from the axios response
    return response.data;

  } catch (error: any) { // Catch potential Axios errors or interceptor errors
    console.error('[TV Details Frontend] Error:', error); // Log the error
    // Extract detail from FastAPI/Axios error structure, fallback to message
    const detail = error.response?.data?.detail || error.message || "Failed to fetch TV show details.";
    // Re-throw a standard error for the calling component to handle
    throw new Error(detail);
  }
};

export const getBookDetails = async (id: string) => {
  try {
    // Use relative path for the configured api instance
    const path = `/media/books/${id}`;
    // Development/Debug Logging: console.log('Request Path:', path);

    // Use the configured axios instance 'api'
    const response = await api.get(path);

    // Axios automatically handles non-2xx errors & JSON parsing.
    // Interceptors on 'api' handle auth header and token refresh.

    // Development/Debug Logging: console.log('Book details received:', response.data);
    // Return the data property from the axios response
    return response.data;

  } catch (error: any) { // Catch potential Axios errors or interceptor errors
    console.error('Book details error:', error); // Log the error
    // Extract detail from FastAPI/Axios error structure, fallback to message
    const detail = error.response?.data?.detail || error.message || "Failed to fetch book details.";
    // Re-throw a standard error for the calling component to handle
    throw new Error(detail);
  }
};

export const searchQuick = async (query: string) => {
  const emptyResults = {
    movies: [],
    tv_shows: [],
    books: [],
    articles: []
  };

  try {
    // Use relative path and params option for the configured api instance
    const path = `/media/search/quick`;
    // Development/Debug Logging: console.log('[Quick Search] Request Path:', path, 'Query:', query);

    // Use the configured axios instance 'api' with query params
    const response = await api.get(path, { params: { query } });

    // Axios automatically handles non-2xx errors & JSON parsing.
    // Interceptors on 'api' handle auth header and token refresh.

    // Development/Debug Logging: console.log('[Quick Search] Success response:', response.data);
    // Return the data property from the axios response
    return response.data;

  } catch (error: any) { // Catch potential Axios errors or interceptor errors
    console.error('[Quick Search] Error:', error); // Log the error
    // Maintain original behavior: return empty results on error
    return emptyResults;
  }
};

export const getArticleDetails = async (articleId: string) => {
  try {
    // Development/Debug Logging: console.log("[Frontend] Fetching article with ID:", articleId);

    // Use relative path for the configured api instance
    const path = `/media/article/${articleId}`;
    // Development/Debug Logging: console.log(`[Frontend] Making request to path: ${path}`);

    // Use the configured axios instance 'api'
    const response = await api.get(path);

    // Axios automatically handles non-2xx errors & JSON parsing.
    // Interceptors on 'api' handle auth header and token refresh.

    // Development/Debug Logging: console.log("[Frontend] Article data received:", response.data);
    // Return the data property from the axios response
    return response.data;

  } catch (error: any) { // Catch potential Axios errors or interceptor errors
    console.error("[Frontend] Error fetching article details:", error); // Log the error
    // Extract detail from FastAPI/Axios error structure, fallback to message
    const detail = error.response?.data?.detail || error.message || "Failed to fetch article details.";
    // Re-throw a standard error for the calling component to handle
    throw new Error(detail);
  }
};

// Helper function to check if user is authenticated
export const checkAuth = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false
    
    // Correct path for checking auth (/api/auth/me)
    // Also ensure it uses the 'api' instance to include the token
    const response = await api.get('/api/auth/me') 
    return response.status === 200
  } catch (error) {
    return false
  }
}

// Explore API Endpoints
export async function getTrendingMedia(
  tab: string = "All",
  options?: {
    minRating?: number,
    maxRating?: number,
    page?: number,
    limit?: number
  }
) {
  // Development/Debug Logging: console.log(`Fetching trending media for tab: ${tab}`);
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

    // Use relative path for the configured api instance
    const path = `/media/explore/trending`;
    // Development/Debug Logging: console.log('Request Path:', path, 'Params:', params.toString());

    // Use the configured axios instance 'api' with query params object
    // Note: Pass URLSearchParams directly to axios params
    const response = await api.get(path, { params });

    // Axios handles non-2xx and JSON parsing. Interceptors handle auth.

    // Development/Debug Logging: console.log(`Received ${response.data.results.length} trending items`);
    return response.data;

  } catch (error: any) {
    console.error("Failed to fetch trending media:", error); // Log error
    // Maintain original behavior: return empty results array on error
    return defaultResponse;
  }
}

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
  // Development/Debug Logging: console.log(`Fetching new releases for tab: ${tab}`);
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

    // Use relative path for the configured api instance
    const path = `/media/explore/new-releases`;
    // Development/Debug Logging: console.log('Request Path:', path, 'Params:', params.toString());

    // Use the configured axios instance 'api' with query params object
    const response = await api.get(path, { params });

    // Axios handles non-2xx and JSON parsing. Interceptors handle auth.

    // Development/Debug Logging: console.log(`Received ${response.data.results.length} new releases`);
    return response.data;

  } catch (error: any) {
    console.error("Failed to fetch new releases:", error); // Log error
    // Maintain original behavior: return empty results array on error
    return defaultResponse;
  }
}

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
  // Development/Debug Logging: console.log(`Fetching ${category} media for tab: ${tab}`);
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

    // Use relative path including the category for the configured api instance
    const path = `/media/explore/category/${category}`;
    // Development/Debug Logging: console.log('Request Path:', path, 'Params:', params.toString());

    // Use the configured axios instance 'api' with query params object
    const response = await api.get(path, { params });

    // Axios handles non-2xx and JSON parsing. Interceptors handle auth.

    // Development/Debug Logging: console.log(`Received ${response.data.results.length} items for ${category}`);
    return response.data;

  } catch (error: any) {
    console.error(`Failed to fetch ${category} media:`, error); // Log error
    // Maintain original behavior: return empty results array on error
    return defaultResponse;
  }
}