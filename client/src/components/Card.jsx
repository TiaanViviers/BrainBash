import React from "react";

// Helper to merge classNames
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

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

const CardHeader = React.forwardRef(function CardHeader({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-2 p-6", className)}
      {...props}
    />
  );
});

const CardTitle = React.forwardRef(function CardTitle({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("text-2xl md:text-3xl font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  );
});

const CardDescription = React.forwardRef(function CardDescription({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("text-sm text-gray-400", className)}
      {...props}
    />
  );
});

const CardContent = React.forwardRef(function CardContent({ className = "", ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("p-6 space-y-4", className)}
      {...props}
    />
  );
});

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

