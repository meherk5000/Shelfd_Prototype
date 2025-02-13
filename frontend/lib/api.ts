// lib/api.ts
import axios from 'axios'
import { API_BASE_URL } from './config'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add authentication header to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/auth/sign-in'
    }
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

export async function checkAuth() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return response.data;
  } catch (error) {
    console.error('Check auth error:', error);
    return null;
  }
}