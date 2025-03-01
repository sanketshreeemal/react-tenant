/**
 * FormSelect Component
 * Changes made:
 * - Ensured consistent light mode styling
 * - Removed any dark mode conditional styling
 * - Enforced light background with dark text
 */
import React from 'react';

interface FormSelectProps {
  label?: string;
  required?: boolean;
  error?: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  id?: string;
  placeholder?: string;
  [x: string]: any; // For other HTML select attributes
}

export default function FormSelect({ 
  label, 
  required, 
  error, 
  className = '', 
  id,
  options,
  placeholder,
  ...props 
}: FormSelectProps) {
  return (
    <div className="mb-4">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        {...props}
        className={`shadow-sm block w-full sm:text-sm rounded-md 
          border-gray-300 bg-white text-gray-900
          focus:ring-blue-500 focus:border-blue-500 
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${className}`}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 