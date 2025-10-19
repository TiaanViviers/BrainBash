/**
 * Avatar component for displaying user profile images.
 * Provides a composable API with Avatar, AvatarImage, and AvatarFallback.
 */

import React from "react";

/**
 * Avatar container component with circular styling.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components (AvatarImage or AvatarFallback)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Avatar wrapper element
 */
export function Avatar({ children, className = "" }) {
  return (
    <div
      className={`relative flex shrink-0 overflow-hidden rounded-full bg-gray-200 shadow-sm border border-gray-300 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Avatar image component for displaying the user's profile picture.
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element|null} Image element or null if no src provided
 */
export function AvatarImage({ src, alt = "", className = "" }) {
  return (
    src ? (
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover transition-transform duration-200 hover:scale-105 ${className}`}
      />
    ) : null
  );
}

/**
 * Avatar fallback component for displaying when image is not available.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Fallback content
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Fallback element
 */
export function AvatarFallback({ children, className = "" }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gray-300 text-sm font-medium text-gray-700 select-none ${className}`}
    >
      {children}
    </div>
  );
}
