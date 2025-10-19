/**
 * Card component system for displaying content in a structured container.
 * Provides a composable API with Card, CardHeader, CardTitle, CardDescription, CardContent, and CardFooter.
 */

import React from "react";

/**
 * Utility function to merge class names.
 * @param {...string} classes - Class names to merge
 * @returns {string} Merged class string
 */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Main card container component.
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Card container
 */
const Card = React.forwardRef(function Card({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-gray-700 bg-[#1f1f2e] text-white shadow-md hover:shadow-lg transition-shadow duration-200",
        className
      )}
      {...props}
    />
  );
});

/**
 * Card header component for titles and descriptions.
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Card header
 */
const CardHeader = React.forwardRef(function CardHeader({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-2 p-6", className)}
      {...props}
    />
  );
});

/**
 * Card title component with large text styling.
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Card title
 */
const CardTitle = React.forwardRef(function CardTitle({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("text-2xl md:text-3xl font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  );
});

/**
 * Card description component with muted text styling.
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Card description
 */
const CardDescription = React.forwardRef(function CardDescription({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("text-sm text-gray-400", className)}
      {...props}
    />
  );
});

/**
 * Card content component for main content area.
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Card content
 */
const CardContent = React.forwardRef(function CardContent({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("p-6 space-y-4", className)}
      {...props}
    />
  );
});

/**
 * Card footer component for actions or additional information.
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Card footer
 */
const CardFooter = React.forwardRef(function CardFooter({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0 border-t border-gray-200 dark:border-gray-700", className)}
      {...props}
    />
  );
});

export {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
};

