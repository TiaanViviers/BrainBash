/**
 * Input component for text entry with styled appearance and dark mode support.
 */

/**
 * Styled input field component.
 * @param {Object} props - Component props
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change event handler
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Input element
 */
export function Input({ value, onChange, placeholder, className = "" }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        shadow-sm transition-all duration-150
        dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
        ${className}`}
    />
  );
}
