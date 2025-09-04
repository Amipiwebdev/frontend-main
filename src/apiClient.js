// src/apiClient.js
import axios from 'axios';

export const API_BASE = 'https://api.mydiamondsearch.com/api';

// Public / token-based client (no cookies by default)
export const api = axios.create({
  baseURL: API_BASE,
});

// (Optional) helper if you later add token-based auth
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('amipiToken', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('amipiToken');
  }
}
