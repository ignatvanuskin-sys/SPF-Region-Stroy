'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '@/lib/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2', className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

/**
 * Вариант «карточкой»: подпись + пояснение, крупный touch-таргет.
 * Используется для выбора категории (Окна / Двери / Фасад) и слотов замера.
 */
const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    label: string;
    hint?: string;
  }
>(({ className, label, hint, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'flex cursor-pointer items-start gap-3 rounded-lg border border-input bg-background p-4 text-left transition-colors duration-200',
      'hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
      'data-[state=checked]:border-primary data-[state=checked]:bg-secondary',
      className,
    )}
    {...props}
  >
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-input data-[state=checked]:border-primary"
      data-state={props.checked ? 'checked' : 'unchecked'}
    >
      <RadioGroupPrimitive.Indicator className="h-2.5 w-2.5 rounded-full bg-primary" />
    </span>
    <span className="block">
      <span className="block text-[16px] font-semibold text-foreground">{label}</span>
      {hint && <span className="mt-0.5 block text-[14px] text-muted-foreground">{hint}</span>}
    </span>
  </RadioGroupPrimitive.Item>
));
RadioCard.displayName = 'RadioCard';

export { RadioGroup, RadioCard };
