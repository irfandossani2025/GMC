import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const messageId = `${inputId}-message`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          {...props}
          ref={ref}
          id={inputId}
          dir={props.dir ?? (['email', 'tel', 'password', 'date', 'number'].includes(props.type || '') ? 'ltr' : 'auto')}
          aria-invalid={error ? true : undefined}
          aria-describedby={[props['aria-describedby'], (error || helperText) ? messageId : undefined].filter(Boolean).join(' ') || undefined}
          className={cn(
            'ui-input w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300',
            className
          )}
        />
        {error && (
          <p id={messageId} role="alert" className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p id={messageId} className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
