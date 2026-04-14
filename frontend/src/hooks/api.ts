import axios from 'axios';

export const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:3000`;
  return 'http://localhost:3000';
};

export const api = axios.create({ baseURL: resolveApiBaseUrl() });

export const resolveMediaUrl = (url?: string | null) => {
  if (!url) return url ?? null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${resolveApiBaseUrl()}${url.startsWith('/') ? url : `/${url}`}`;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

