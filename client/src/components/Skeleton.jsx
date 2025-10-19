import React from "react";

/**
 * Skeleton loader component
 * @param {string} className - Tailwind classes to customize size, shape, spacing
 * @param {object} props - Additional props passed to the div
 */
export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`
        animate-pulse
        rounded-md
        bg-gray-700
        dark:bg-gray-800
        ${className}
      `}
      {...props}
    />
  );
}
