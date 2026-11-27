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
    | "info"
    | "outline";
  dot?: boolean;
}

export const Badge = ({
  className,
  variant = "default",
  dot = false,
  children,
  ...props
}: BadgeProps) => {
  const variants = {
    default: "bg-muted text-muted-foreground border-transparent",
    primary: "bg-primary/10 text-primary border-transparent",
    secondary: "bg-muted text-foreground border-transparent",
    success: "bg-success-light/40 text-success border-transparent",
    warning: "bg-warning-light/40 text-warning border-transparent",
    danger: "bg-danger-light/40 text-danger border-transparent",
    info: "bg-info-light/40 text-info border-transparent",
    outline: "border border-border bg-card text-foreground",
  };

  return (
    <div
      data-nexa-badge={variant}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors select-none",
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          data-nexa-badge-dot
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full shrink-0 bg-current"
        />
      )}
      {children}
    </div>
  );
};
