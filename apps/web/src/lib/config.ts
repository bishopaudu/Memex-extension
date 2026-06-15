// All API calls go through this — swap localhost for production URL
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
