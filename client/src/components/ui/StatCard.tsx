import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatCardVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface StatCardProps {
  title: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: React.ComponentType<{ className?: string }> | ReactNode;
  variant?: StatCardVariant;
  className?: string;
  onClick?: () => void;
}

const ICON_CONTAINER_VARIANTS: Record<StatCardVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success-light/30 text-success",
  warning: "bg-warning-light/30 text-warning",
  danger: "bg-danger-light/30 text-danger",
  info: "bg-info-light/30 text-info",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: IconOrElement,
  variant = "default",
  className,
  onClick,
}: StatCardProps) {
  const renderIcon = () => {
    if (!IconOrElement) return null;
    if (React.isValidElement(IconOrElement)) return IconOrElement;
    const IconComp = IconOrElement as React.ComponentType<{ className?: string }>;
    return <IconComp className="h-5 w-5" />;
  };

  return (
    <div
      data-nexa-stat-card=""
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "rounded-2xl bg-[var(--nexa-surface-l1)] p-5 transition-all",
        onClick && "hover:bg-[var(--nexa-surface-hover)] cursor-pointer",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </span>
        {IconOrElement && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
              ICON_CONTAINER_VARIANTS[variant],
            )}
          >
            {renderIcon()}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}
