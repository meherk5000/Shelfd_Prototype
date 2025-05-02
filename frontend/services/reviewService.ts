import axios from 'axios'
import { api } from '@/lib/api'; // Import the configured api instance

// Remove API_BASE_URL constant, rely on api instance
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Remove getAuthToken and getHeaders helpers
// const getAuthToken = (): string | null => { ... }
// const getHeaders = () => { ... }

// Types matching backend schemas/models would be ideal here
interface ReviewPayload {
    media_id: string
    media_type: 'book' | 'movie' | 'tv'
    rating: number
    review?: string | null
    contains_spoilers?: boolean
    title?: string
    image_url?: string
    creator?: string
}

interface UpdateReviewPayload {
    rating?: number
    review_text?: string | null
    contains_spoilers?: boolean
}

// --- API Functions (Refactored) ---

// Use api instance and relative URLs, remove manual header handling

export const submitOrUpdateReviewViaShelf = async (payload: ReviewPayload) => {
    // const headers = getHeaders(); // Removed
    // Use relative path
    const response = await api.post(`/api/shelves/rate`, payload /*, { headers }*/); // Removed headers
    return response.data
}

export const updateReview = async (reviewId: string, payload: UpdateReviewPayload) => {
    // const headers = getHeaders(); // Removed
    // Use relative path
    const response = await api.put(`/api/reviews/${reviewId}`, payload /*, { headers }*/); // Removed headers
    return response.data
}

export const deleteReview = async (reviewId: string) => {
    // const headers = getHeaders(); // Removed
    // Use relative path
    const response = await api.delete(`/api/reviews/${reviewId}` /*, { headers }*/); // Removed headers
    return response.data
}

export const getUserReview = async (mediaType: string, mediaId: string) => {
    // const headers = getHeaders(); // Removed
    // Use relative path
    const response = await api.get(`/api/reviews/user/${mediaType}/${mediaId}` /*, { headers }*/); // Removed headers
    return response.data
}

export const getMediaReviews = async (mediaType: string, mediaId: string, sort_by = 'newest', limit = 20, skip = 0) => {
    // const headers = getHeaders(); // Removed (auth is optional, interceptor handles if present)
    // Use relative path
    const url = `/api/reviews/${mediaType}/${mediaId}`; // Relative URL
    console.log(`[reviewService] Fetching reviews from: ${url}`);
    const response = await api.get(url, {
        params: { sort_by, limit, skip },
        // headers, // Removed
    })
    return response.data
}

export const likeReview = async (reviewId: string) => {
    // const headers = getHeaders(); // Removed
    // Use relative path
    const response = await api.post(`/api/reviews/${reviewId}/like`, {} /*, { headers }*/); // Removed headers
    return response.data
} 