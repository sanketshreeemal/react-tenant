/**
 * FormInput Component
 * Changes made:
 * - Ensured consistent light mode styling
 * - Removed any dark mode conditional styling
 * - Enforced light background with dark text
 */
import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export default function FormInput({ 
  label, 
  required, 
  error, 
  className = '', 
  id,
  ...props 
}: FormInputProps) {
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
      <input
        id={id}
        {...props}
        className={`shadow-sm block w-full sm:text-sm rounded-md 
          border-gray-300 bg-white text-gray-900
          focus:ring-blue-500 focus:border-blue-500 
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${className}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 