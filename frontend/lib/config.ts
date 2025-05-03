// Use NEXT_PUBLIC_ prefix for environment variables accessible on the client-side
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Remove the duplicate API_URL and the incorrect API_BASE_URL definitions
// export const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
// export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://shelfd-prototype.onrender.com';

// Keep this logging for verification during development
console.log('API Base URL:', API_BASE_URL);
