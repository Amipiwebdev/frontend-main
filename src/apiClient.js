// src/apiClient.js
import axios from 'axios';

export const API_BASE =
  import.meta.env.VITE_API_BASE || 'https://api.amipi.com/api';

// ---------- Public client (no cookies) — keep existing code working ----------
export const api = axios.create({
  baseURL: API_BASE, // e.g. https://api.amipi.com/api
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// ---------- Session client (cookies) ----------
/**
 * Base at origin (no trailing /api) so we can choose the path.
 * We'll add small helpers below that auto-prefix "/api" for you.
 */
export const apiSession = axios.create({
  baseURL: 'https://api.amipi.com',
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// ---------- Small helpers so you never worry about '/api' ----------
function ensureApiPath(p = '') {
  // allow callers to pass 'me', '/me', 'api/me', etc.
  const s = String(p).trim();
  if (s.startsWith('/api/')) return s;                 // '/api/me'
  if (s === '/api' || s === 'api') return '/api';      // 'api'
  const core = s.replace(/^\/?api\/?/i, '').replace(/^\/?/, ''); // normalize
  return `/api/${core}`;                                // 'me' => '/api/me'
}

// Use these for any endpoint that needs session/cookies.
export function sget(path, config) {
  return apiSession.get(ensureApiPath(path), {
    headers: { Accept: 'application/json' },
    ...(config || {}),
  });
}

export function spost(path, data, config) {
  return apiSession.post(ensureApiPath(path), data, {
    headers: { Accept: 'application/json' },
    ...(config || {}),
  });
}

// ---------- Optional token helper (unchanged) ----------
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
