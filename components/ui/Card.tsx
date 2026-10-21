import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'ui-card bg-white rounded-xl border border-primary/10 shadow-md shadow-primary/5 transition-shadow hover:shadow-lg hover:shadow-primary/10',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('ui-card-header px-6 py-4 border-b border-primary/10', className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h2 className={cn('ui-card-title text-xl font-semibold text-primary', className)}>
    {children}
  </h2>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div {...props} className={cn('ui-card-content px-6 py-4', className)}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('ui-card-footer px-6 py-4 border-t border-primary/10 flex justify-end gap-2', className)}>
    {children}
  </div>
);
