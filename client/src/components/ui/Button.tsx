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
    "inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer";

  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-muted text-foreground hover:bg-muted/80",
    ghost: "text-foreground hover:bg-muted",
    outline: "bg-muted text-foreground hover:bg-muted/80",
    danger: "bg-danger text-destructive-foreground hover:bg-danger/90",
  };

  const sizes = {
    icon: "h-11 w-11 p-0 text-sm",
    sm: "h-11 sm:h-9 px-3 text-sm gap-2",
    md: "h-11 px-4 text-sm gap-2",
    lg: "h-12 px-5 text-base gap-2",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        baseStyles,
        "nexa-action",
        `nexa-action-${variant}`,
        size === "icon" && "nexa-action-icon",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  );
};
