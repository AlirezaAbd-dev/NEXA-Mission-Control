import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "outline";
}

export const Badge = ({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) => {
  const variants = {
    default:
      "bg-slate-100 text-slate-700 dark:bg-muted dark:text-slate-300",
    primary: "bg-primary/10 text-primary border border-primary/25",
    secondary:
      "bg-slate-200 text-slate-800 dark:bg-muted dark:text-slate-200",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    danger:
      "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800",
    outline:
      "border border-slate-300 dark:border-border text-slate-700 dark:text-slate-300",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors select-none",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
