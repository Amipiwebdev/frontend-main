// src/apiClient.js
import axios from 'axios';

export const API_BASE = 'https://jewelry.amipi.com/api';

// Default client (no cookies) – works with ACAO: *
export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// Session client (cookies) – use only if an endpoint truly needs the PHP session
export const apiSession = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

// optional token helper
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    apiSession.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('amipiToken', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    delete apiSession.defaults.headers.common['Authorization'];
    localStorage.removeItem('amipiToken');
  }
}
