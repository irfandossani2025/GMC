import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
      primary: 'bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary-600 focus:ring-primary/40',
      secondary: 'bg-accent/10 text-primary border border-accent/20 hover:bg-accent/20 focus:ring-accent/40',
      danger: 'bg-error text-white hover:bg-red-600 focus:ring-error/40',
      outline: 'border-2 border-primary text-primary hover:bg-primary-50 focus:ring-primary/30',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };
    return (
      <button
        ref={ref}
        data-variant={variant}
        data-size={size}
        aria-busy={isLoading || undefined}
        className={cn('ui-button', baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
