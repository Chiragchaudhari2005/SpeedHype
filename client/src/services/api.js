import axios from 'axios';

/**
 * API client service for SpeedHype application
 * Provides configured Axios instances for making authenticated and unauthenticated requests
 */

// Base URL for API requests from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Default Axios instance for unauthenticated requests
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

/**
 * Creates an authenticated request configuration using Clerk token
 * 
 * @param {Function} getToken - Function that returns a Clerk session token
 * @returns {Promise<Object>} Promise resolving to authenticated Axios instance
 * 
 * @example
 * // Using with Clerk's useAuth hook
 * import { useAuth } from '@clerk/react';
 * import { createAuthenticatedRequest } from './services/api';
 * 
 * const { getToken } = useAuth();
 * 
 * // Create authenticated request instance
 * const authApi = await createAuthenticatedRequest(getToken);
 * 
 * // Make authenticated request
 * const response = await authApi.get('/auth/me');
 */
export async function createAuthenticatedRequest(getToken) {
  if (!getToken || typeof getToken !== 'function') {
    throw new Error('getToken must be a function that returns a Clerk session token');
  }

  try {
    // Get the session token from Clerk
    const token = await getToken();
    
    if (!token) {
      throw new Error('No session token available. User may not be authenticated.');
    }

    // Create authenticated Axios instance
    const authenticatedApi = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: 10000,
    });

    return authenticatedApi;
  } catch (error) {
    console.error('Failed to create authenticated request:', error);
    throw error;
  }
}

/**
 * Helper function to make authenticated requests with inline token
 * 
 * @param {Function} getToken - Function that returns a Clerk session token
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {string} url - API endpoint URL (relative to baseURL)
 * @param {Object} data - Request data for POST/PUT requests
 * @param {Object} config - Additional Axios configuration
 * @returns {Promise<Object>} Promise resolving to API response
 * 
 * @example
 * // Using with Clerk's useAuth hook
 * import { useAuth } from '@clerk/react';
 * import { authenticatedRequest } from './services/api';
 * 
 * const { getToken } = useAuth();
 * 
 * // Make authenticated GET request
 * const userData = await authenticatedRequest(getToken, 'GET', '/auth/me');
 * 
 * // Make authenticated POST request
 * const result = await authenticatedRequest(getToken, 'POST', '/posts', { title: 'New Post' });
 */
export async function authenticatedRequest(getToken, method, url, data = null, config = {}) {
  if (!getToken || typeof getToken !== 'function') {
    throw new Error('getToken must be a function that returns a Clerk session token');
  }

  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('No session token available. User may not be authenticated.');
    }

    const requestConfig = {
      ...config,
      method,
      url,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestConfig.data = data;
    }

    return await api.request(requestConfig);
  } catch (error) {
    console.error('Authenticated request failed:', error);
    throw error;
  }
}

/**
 * Health check endpoint
 * @returns {Promise<Object>} Promise resolving to health check response
 */
export async function checkHealth() {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
}

/**
 * Test authentication endpoint
 * @param {Function} getToken - Function that returns a Clerk session token
 * @returns {Promise<Object>} Promise resolving to authentication test response
 */
export async function testAuth(getToken) {
  return authenticatedRequest(getToken, 'GET', '/auth/me');
}

// Export the base API instance
export default api;