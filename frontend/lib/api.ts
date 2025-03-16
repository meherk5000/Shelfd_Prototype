// lib/api.ts
import axios from 'axios'

// Get the API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create an axios instance with default config
const api = axios.create({
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
          localStorage.removeItem('token')
          window.location.href = '/auth/sign-in'
          return Promise.reject(error)
        }
        
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {}, {
          headers: {
            'Authorization': `Bearer ${refreshToken}`
          }
        })
        
        // If successful, update tokens
        if (response.data.access_token) {
          localStorage.setItem('token', response.data.access_token)
          
          // Process the queue with the new token
          processQueue(null, response.data.access_token)
          
          // Update the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`
          
          // Reset refreshing flag
          isRefreshing = false
          
          // Retry the original request
          return api(originalRequest)
        } else {
          // Unexpected response - logout
          processQueue(error, null)
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/auth/sign-in'
          return Promise.reject(error)
        }
      } catch (refreshError) {
        // Refresh failed - logout
        processQueue(refreshError as Error, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/auth/sign-in'
        return Promise.reject(refreshError)
      }
    }
    
    // For other error status codes, just reject
    return Promise.reject(error)
  }
)

export default api

export const searchMedia = async (query: string, mediaType?: string, page: number = 1) => {
  try {
      console.log('Making API request with:', { query, mediaType, page }); // Debug log

      const params = new URLSearchParams({
          query,
          ...(mediaType && { media_type: mediaType }),
          page: page.toString(),
      });

      const url = `${API_BASE_URL}/media/search?${params}`;
      console.log('Request URL:', url); // Debug log

      const response = await fetch(url);
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data); // Debug log
      return data;
  } catch (error) {
      console.error('Search API error:', error);
      throw error;
  }
};


export const getMovieDetails = async (movieId: number) => {
  try {
    console.log('Fetching movie details for:', movieId);
    const url = `${API_BASE_URL}/media/movies/${movieId}`;
    console.log('Request URL:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response text:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.log('Failed to parse error response as JSON:', e);
        errorData = { detail: errorText };
      }
      
      throw new Error(
        errorData.detail || 
        `Failed to fetch movie details: ${response.statusText}`
      );
    }
    
    const data = await response.json();
    console.log('Movie details received:', data);
    return data;
  } catch (error) {
    console.error('Movie details error:', error);
    throw error;
  }
};


export const getTVDetails = async (tvId: number) => {
  try {
    const url = `${API_BASE_URL}/media/tv/${tvId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch TV show details (${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[TV Details Frontend] Error:', error);
    throw error;
  }
};

export const getBookDetails = async (id: string) => {
  const response = await axios.get(
    `${API_BASE_URL}/media/books/${id}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const searchQuick = async (query: string) => {
  const emptyResults = {
    movies: [],
    tv_shows: [],
    books: [],
    articles: []
  };

  try {
    const url = `${API_BASE_URL}/media/search/quick?query=${encodeURIComponent(query)}`;
    console.log('[Quick Search] Request URL:', url);
    
    const response = await fetch(url);
    console.log('[Quick Search] Response status:', response.status);
    
    if (!response.ok) {
      console.log('[Quick Search] Error response status:', response.status);
      return emptyResults;
    }
    
    const data = await response.json();
    console.log('[Quick Search] Success response:', data);
    return data;
  } catch (error) {
    console.error('[Quick Search] Error:', error);
    return emptyResults;
  }
};

// Helper function to check if user is authenticated
export const checkAuth = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false
    
    const response = await api.get('/api/auth/me')
    return response.status === 200
  } catch (error) {
    return false
  }
}