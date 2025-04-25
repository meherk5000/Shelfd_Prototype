import axios from 'axios'

// TODO: Use environment variable for API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Base URL without /api

// Helper to get the auth token directly from localStorage
// Caching and refresh are handled by the axios interceptor in api.ts or AuthContext.tsx
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null; // Return null if not in browser environment
}

// Updated getHeaders to use the simplified getAuthToken
const getHeaders = () => { // No longer needs to be async
    const token = getAuthToken();
    const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return headers
}

// Types matching backend schemas/models would be ideal here
interface ReviewPayload {
    media_id: string
    media_type: 'book' | 'movie' | 'tv'
    rating: number
    review?: string | null // Match backend payload (used 'review' in ReviewForm)
    contains_spoilers?: boolean
    // Include title/image if using legacy /shelves/rate endpoint
    title?: string 
    image_url?: string
    creator?: string
}

interface UpdateReviewPayload {
    rating?: number
    review_text?: string | null
    contains_spoilers?: boolean
}

// --- API Functions ---

// Note: These functions now use the simplified, synchronous getHeaders

export const submitOrUpdateReviewViaShelf = async (payload: ReviewPayload) => {
    const headers = getHeaders();
    // Correct path: Needs /api prefix
    const response = await axios.post(`${API_BASE_URL}/api/shelves/rate`, payload, { headers })
    return response.data
}

export const updateReview = async (reviewId: string, payload: UpdateReviewPayload) => {
    const headers = getHeaders();
    // Correct path: Needs /api prefix
    const response = await axios.put(`${API_BASE_URL}/api/reviews/${reviewId}`, payload, { headers })
    return response.data
}

export const deleteReview = async (reviewId: string) => {
    const headers = getHeaders();
    // Correct path: Needs /api prefix
    const response = await axios.delete(`${API_BASE_URL}/api/reviews/${reviewId}`, { headers })
    return response.data
}

export const getUserReview = async (mediaType: string, mediaId: string) => {
    const headers = getHeaders(); // Auth required
    // Correct path: Needs /api prefix
    const response = await axios.get(`${API_BASE_URL}/api/reviews/user/${mediaType}/${mediaId}`, { headers })
    return response.data
}

export const getMediaReviews = async (mediaType: string, mediaId: string, sort_by = 'newest', limit = 20, skip = 0) => {
    const headers = getHeaders(); // Auth optional
    // Correct path: Needs /api prefix
    const url = `${API_BASE_URL}/api/reviews/${mediaType}/${mediaId}`; 
    console.log(`[reviewService] Fetching reviews from: ${url}`);
    const response = await axios.get(url, {
        params: { sort_by, limit, skip },
        headers,
    })
    return response.data 
}

export const likeReview = async (reviewId: string) => {
    const headers = getHeaders(); // Auth required
    // Correct path: Needs /api prefix
    const response = await axios.post(`${API_BASE_URL}/api/reviews/${reviewId}/like`, {}, { headers })
    return response.data
} 