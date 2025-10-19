/**
 * Tabs component system for organizing content into switchable panels.
 * Provides Tabs, TabsList, TabsTrigger, and TabsContent components.
 */

import React, { useState } from "react";

/**
 * Utility function to merge class names.
 * @param {...string} classes - Class names to merge
 * @returns {string} Merged class string
 */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Root tabs container component.
 * @param {Object} props - Component props
 * @param {string} props.defaultValue - Initial active tab value
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Tabs container
 */
export function Tabs({ defaultValue, children, className = "" }) {
  const [active, setActive] = useState(defaultValue);

  // Clone children to pass active state
  return (
    <div className={cn("w-full", className)}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { active, setActive })
          : child
      )}
    </div>
  );
}

/**
 * Container for tab trigger buttons.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - TabsTrigger components
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Tabs list container
 */
export function TabsList({ children, className = "" }) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-600 dark:text-gray-300 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Individual tab button that switches active tab.
 * @param {Object} props - Component props
 * @param {string} props.value - Tab identifier value
 * @param {string} props.active - Currently active tab value
 * @param {Function} props.setActive - Function to set active tab
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Tab trigger button
 */
export function TabsTrigger({ value, active, setActive, children, className = "" }) {
  const isActive = active === value;

  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
        isActive
          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
          : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300",
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * Content panel for a tab, shown when tab is active.
 * @param {Object} props - Component props
 * @param {string} props.value - Tab identifier value
 * @param {string} props.active - Currently active tab value
 * @param {React.ReactNode} props.children - Panel content
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element|null} Tab content or null if not active
 */
export function TabsContent({ value, active, children, className = "" }) {
  if (active !== value) return null;

  return (
    <div
      className={cn(
        "mt-3 rounded-md p-4 bg-white dark:bg-gray-900 shadow-sm transition-colors",
        className
      )}
    >
      {children}
    </div>
  );
}
