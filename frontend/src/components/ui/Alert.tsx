'use client';

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={clsx(
          'relative w-full rounded-lg border p-4',
          {
            'border-gray-200 bg-white text-gray-900': variant === 'default',
            'border-red-200 bg-red-50 text-red-900': variant === 'destructive',
            'border-yellow-200 bg-yellow-50 text-yellow-900': variant === 'warning',
            'border-green-200 bg-green-50 text-green-900': variant === 'success',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = 'Alert';

const AlertDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

const AlertTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={clsx('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export { Alert, AlertTitle, AlertDescription };