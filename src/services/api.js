// API service to handle authentication and other API requests
const API_BASE_URL = '/api';

// Default fetch options
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'same-origin', // Include cookies in requests for same origin
};

/**
 * Authenticate user and get token
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{token: string}>} - Token response
 */
export const authenticate = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/token`, {
      method: 'POST',
      ...defaultOptions,
      body: JSON.stringify({
        user: {
          email,
          password,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Authentication failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

/**
 * Set auth token in the request headers
 * @param {string} token - JWT token
 */
export const setAuthToken = (token) => {
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  } else {
    delete defaultOptions.headers['Authorization'];
  }
};

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - API response
 */
export const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = endpoint.startsWith('/') 
      ? `${API_BASE_URL}${endpoint}`
      : `${API_BASE_URL}/${endpoint}`;
    
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    // Check if response is empty
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

export default {
  authenticate,
  setAuthToken,
  apiRequest,
};