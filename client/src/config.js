// API Configuration
// In production (Render), this will use environment variables
// In development, it falls back to localhost

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default API_URL;
