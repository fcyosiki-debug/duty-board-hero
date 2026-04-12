import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'hero';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95";
    
    const variants = {
      primary: "bg-blue-400 text-white hover:bg-blue-500 shadow-[0_4px_0_0_rgba(96,165,250,1)] hover:translate-y-1 hover:shadow-none",
      secondary: "bg-orange-300 text-white hover:bg-orange-400 shadow-[0_4px_0_0_rgba(253,186,116,1)] hover:translate-y-1 hover:shadow-none",
      danger: "bg-red-400 text-white hover:bg-red-500 shadow-[0_4px_0_0_rgba(248,113,113,1)] hover:translate-y-1 hover:shadow-none",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800",
      hero: "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-white shadow-[0_4px_0_0_rgba(217,119,6,1)] hover:translate-y-1 hover:shadow-none ring-2 ring-yellow-300 ring-offset-2",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm rounded-xl",
      md: "h-12 px-6 text-base",
      lg: "h-16 px-8 text-xl rounded-2xl",
      xl: "h-24 px-10 text-3xl rounded-3xl",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyle, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
