import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-1 dark:focus:ring-offset-[#070e10] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer";

  const variants = {
    primary:
      "bg-teal-600 hover:bg-teal-500 text-white dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-[#070e10] shadow-xs active:bg-teal-700 dark:active:bg-teal-300 font-semibold cursor-pointer",
    secondary:
      "bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/80 dark:border-transparent dark:bg-[#132428] dark:hover:bg-[#183035] dark:text-slate-200 font-medium cursor-pointer",
    ghost:
      "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#132428] dark:hover:text-slate-100 cursor-pointer",
    outline:
      "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:border-[#183035] dark:bg-transparent dark:text-slate-300 dark:hover:bg-[#132428] dark:hover:border-teal-500/30 cursor-pointer",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white dark:bg-rose-500/20 dark:text-rose-400 dark:border dark:border-rose-500/30 dark:hover:bg-rose-500/30 cursor-pointer",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs gap-2",
    md: "h-9 px-4 text-sm gap-2",
    lg: "h-10 px-5 text-sm gap-2",
    icon: "p-2 text-sm",
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
