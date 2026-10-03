import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui Input. font-size 16px обязателен: iOS Safari иначе зумит страницу
 * при фокусе. Высота 48px — touch-таргет.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-base text-foreground transition-colors duration-200',
        'placeholder:text-muted-foreground/70',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25',
        'disabled:cursor-not-allowed disabled:opacity-55',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20',
        'file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
