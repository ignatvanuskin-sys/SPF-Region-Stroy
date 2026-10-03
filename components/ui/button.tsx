import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui Button. Варианты вместо inline-условий классов.
 * Минимальная высота 48px — требование touch-таргета (WCAG 2.5.8 / 44×44).
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-lg text-base font-semibold cursor-pointer text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0',
    // На мобильных длинная подпись переносится, с sm — в одну строку:
    // иначе «Получить расчет и вызвать замерщика» шире вьюпорта 360px.
    'whitespace-normal leading-snug sm:whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        wa: 'bg-wa text-wa-foreground hover:bg-wa/90',
        accent: 'bg-accent text-accent-foreground hover:bg-accent/90',
        outline: 'border border-input bg-background text-foreground hover:border-primary hover:text-primary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-primary hover:bg-secondary',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-5 py-3',
        sm: 'h-11 px-4 text-sm',
        lg: 'h-14 px-7 text-[17px]',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Полиморфная композиция с Radix: <Button asChild><Link/></Button>. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    // className передаём снаружи cva: внутри cva классы склеиваются через clsx,
    // который не разрешает конфликты Tailwind. Из-за этого, например,
    // whitespace-normal не перебивал whitespace-nowrap из базы, и длинная
    // подпись кнопки растягивала страницу на мобильном.
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
