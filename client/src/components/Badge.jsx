import React from "react";

// Tailwind variants with hover and transition effects
const variantClasses = {
  default: "bg-blue-500 text-white border-transparent hover:bg-blue-600",
  secondary: "bg-gray-200 text-gray-800 border-transparent hover:bg-gray-300",
  destructive: "bg-red-500 text-white border-transparent hover:bg-red-600",
  outline: "border border-gray-300 text-gray-800 bg-transparent hover:bg-gray-100",
};

function Badge({ children, variant = "default", className = "" }) {
  const baseStyles =
    "whitespace-nowrap inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-150";

  return (
    <span className={`${baseStyles} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
