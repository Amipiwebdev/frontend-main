// src/apiClient.js
import axios from 'axios';

export const API_BASE =
  import.meta.env.VITE_API_BASE || 'https://api.amipi.com/api';

// JSON (no cookies) — use for public endpoints
export const api = axios.create({
  baseURL: API_BASE, // e.g., https://api.amipi.com/api
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// With cookies — use when you need session (SSO/me)
export const apiSession = axios.create({
  baseURL: 'https://api.amipi.com', // note: no trailing /api here
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// Optional token helper
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    apiSession.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem('amipiToken', token);
  } else {
    delete api.defaults.headers.common.Authorization;
    delete apiSession.defaults.headers.common.Authorization;
    localStorage.removeItem('amipiToken');
  }
}
