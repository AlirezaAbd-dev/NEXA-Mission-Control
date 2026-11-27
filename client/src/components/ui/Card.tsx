import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "glow" | "subtle";
}

export const Card = ({
  className,
  children,
  variant = "default",
  ...props
}: CardProps) => {
  const variantClass = {
    default: "bg-card text-foreground transition-colors",
    glass:
      "bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-lg shadow-black/5 text-foreground",
    glow:
      "bg-card border border-primary/20 shadow-md shadow-primary/5 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 text-foreground",
    subtle: "bg-muted/50 text-foreground",
  }[variant];

  return (
    <div
      data-nexa-card="md"
      data-nexa-card-variant={variant}
      className={cn("relative rounded-2xl", variantClass, className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "font-bold leading-none tracking-tight text-sm sm:text-base text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn(
      "text-xs text-muted-foreground leading-relaxed",
      className,
    )}
    {...props}
  >
    {children}
  </p>
);

export const CardContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0", className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center p-5 pt-0", className)} {...props}>
    {children}
  </div>
);
