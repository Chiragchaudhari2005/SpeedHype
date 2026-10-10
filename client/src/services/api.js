import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export async function createAuthenticatedRequest(getToken) {
  if (typeof getToken !== 'function') {
    throw new Error('getToken must be a function that returns a Clerk session token');
  }

  const token = await getToken();
  if (!token) {
    throw new Error('No session token available. User may not be authenticated.');
  }

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: 10000,
  });
}

export async function authenticatedRequest(getToken, method, url, data = null, config = {}) {
  if (typeof getToken !== 'function') {
    throw new Error('getToken must be a function that returns a Clerk session token');
  }

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
      Authorization: `Bearer ${token}`,
    },
  };

  if (data !== null && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    requestConfig.data = data;
  }

  return api.request(requestConfig);
}

export async function checkHealth() {
  const response = await api.get('/health');
  return response.data;
}

export async function testAuth(getToken) {
  return authenticatedRequest(getToken, 'GET', '/auth/me');
}

export default api;
