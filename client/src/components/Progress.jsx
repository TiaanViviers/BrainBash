import React from "react";

/**
 * Custom progress bar
 * @param {number} value - Progress percentage (0–100)
 * @param {string} className - Additional Tailwind classes
 */
export function Progress({ value = 0, className = "" }) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-700 ${className}`}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-in-out"
        style={{ width: `${clampedValue}%` }}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
        {clampedValue}%
      </span>
    </div>
  );
}
