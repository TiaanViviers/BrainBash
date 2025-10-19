import React from "react";

// Wrapper
export function Avatar({ children, className = "" }) {
  return (
    <div
      className={`relative flex shrink-0 overflow-hidden rounded-full bg-gray-200 shadow-sm border border-gray-300 ${className}`}
    >
      {children}
    </div>
  );
}

// Image
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

// Fallback
export function AvatarFallback({ children, className = "" }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gray-300 text-sm font-medium text-gray-700 select-none ${className}`}
    >
      {children}
    </div>
  );
}
