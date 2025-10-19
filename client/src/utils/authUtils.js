/**
 * Get the access token from either localStorage or sessionStorage
 * @returns {string|null} The access token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
};

/**
 * Get the current user from either localStorage or sessionStorage
 * @returns {object|null} The parsed user object or null if not found
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser");
  return userStr ? JSON.parse(userStr) : null;
};
