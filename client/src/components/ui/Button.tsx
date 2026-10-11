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
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

  const variants = {
    primary:
      'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white shadow-md shadow-teal-500/20 hover:shadow-teal-500/30 border border-teal-400/30 focus:ring-teal-500 dark:from-teal-500 dark:to-teal-400 dark:text-slate-950 dark:font-semibold',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200/80 focus:ring-slate-400 dark:bg-[#132428] dark:text-slate-200 dark:hover:bg-[#1b4d52] border border-transparent dark:border-[#183035]',
    outline:
      'border border-slate-200/80 bg-white/80 dark:bg-[#0d1a1d] backdrop-blur-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#132428] hover:border-slate-300 dark:hover:border-[#2dd4bf]/40 focus:ring-teal-500 shadow-2xs',
    ghost:
      'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 focus:ring-slate-400 dark:text-slate-400 dark:hover:bg-[#132428] dark:hover:text-slate-100',
    danger:
      'bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700 focus:ring-rose-500 shadow-md shadow-rose-500/20 border border-rose-400/30',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 font-medium',
    md: 'text-sm px-3.5 py-2 gap-2 font-medium',
    lg: 'text-base px-4 py-2.5 gap-2.5 font-medium',
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
