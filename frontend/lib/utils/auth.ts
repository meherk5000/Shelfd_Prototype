// Utility function for making authenticated API requests

/**
 * Fetch with authentication token
 * This function wraps the standard fetch API and adds the auth token from localStorage
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Get the auth token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Prepare headers with auth token if available
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  // Return fetch with the auth headers included
  return fetch(url, {
    ...options,
    headers
  });
} 