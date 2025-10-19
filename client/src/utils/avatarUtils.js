/**
 * Avatar Utility Functions
 * 
 * Standardizes avatar handling across the frontend:
 * - Backend always stores/returns avatar IDs (e.g., "stewie")
 * - Frontend always displays full URLs (e.g., "${API_URL}/api/avatars/stewie")
 */

import API_URL from '../config';

/**
 * Convert avatar ID to display URL
 * @param {string} avatarId - Avatar ID from backend (e.g., "stewie")
 * @returns {string} Full URL for display
 */
export const idToUrl = (avatarId) => {
  if (!avatarId) return '';
  return `${API_URL}/api/avatars/${avatarId}`;
};

/**
 * Convert display URL to avatar ID for backend
 * @param {string} avatarUrl - Full URL from frontend (e.g., "${API_URL}/api/avatars/stewie")
 * @returns {string} Avatar ID for backend
 */
export const urlToId = (avatarUrl) => {
  if (!avatarUrl) return '';
  const prefix = `${API_URL}/api/avatars/`;
  if (avatarUrl.startsWith(prefix)) {
    return avatarUrl.substring(prefix.length).replace(/\.[a-zA-Z0-9]+$/, '');
  }
  return avatarUrl.replace(/\.[a-zA-Z0-9]+$/, '');
};

/**
 * Resolve avatar from backend data
 * Handles both ID and URL formats from backend, returns display URL
 * @param {string} backendAvatar - Avatar value from backend (ID or URL)
 * @returns {string} Display URL
 */
export const resolveAvatar = (backendAvatar) => {
  if (!backendAvatar) return '';
  
  // If already a full URL, return as-is
  if (backendAvatar.startsWith('http')) {
    return backendAvatar;
  }
  
  // Otherwise treat as ID and convert to URL
  return idToUrl(backendAvatar);
};
