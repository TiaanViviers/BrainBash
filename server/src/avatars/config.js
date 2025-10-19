/**
 * Avatar Configuration
 * 
 * Central configuration for available avatars.
 * Used for validation across the application.
 */

/**
 * List of available avatar IDs
 * These correspond to filenames in client/src/data/avatars/
 */
export const AVAILABLE_AVATARS = [
  'andrew',
  'brian',
  'bubbles',
  'choomah',
  'clarence',
  'homer',
  'nick',
  'stewie'
];

/**
 * Default avatar assigned to new users
 */
export const DEFAULT_AVATAR = 'andrew';

/**
 * Validate if an avatar ID is valid
 * @param {string} avatarId - Avatar ID to validate
 * @returns {boolean} True if valid
 */
export function isValidAvatarId(avatarId) {
  if (!avatarId || typeof avatarId !== 'string') {
    return false;
  }
  return AVAILABLE_AVATARS.includes(avatarId.toLowerCase());
}

/**
 * Get avatar filename from ID
 * Handles case-insensitive matching
 * @param {string} avatarId - Avatar ID
 * @returns {string|null} Filename or null if not found
 */
export function getAvatarFilename(avatarId) {
  if (!avatarId) return null;
  
  // Map of lowercase ID to actual filename
  const filenameMap = {
    'andrew': 'Andrew.png',
    'brian': 'Brian.png',
    'bubbles': 'Bubbles.png',
    'choomah': 'Choomah.png',
    'clarence': 'Clarence.png',
    'homer': 'Homer.JPG',
    'nick': 'Nick.png',
    'stewie': 'Stewie.png'
  };
  
  return filenameMap[avatarId.toLowerCase()] || null;
}
