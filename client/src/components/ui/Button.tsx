import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm shadow-indigo-200 dark:shadow-none dark:bg-indigo-500 dark:hover:bg-indigo-600',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    outline:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm shadow-red-200 dark:shadow-none',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-4 py-2.5 gap-2.5',
    icon: 'p-2 text-sm',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  );
};
