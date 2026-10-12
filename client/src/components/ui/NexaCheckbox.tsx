"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  wrapperClassName?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      wrapperClassName,
      checked = false,
      indeterminate = false,
      onCheckedChange,
      onChange,
      disabled,
      label,
      description,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id || (label ? generatedId : undefined);
    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => internalRef.current!);

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    const isCheckedOrIndeterminate = checked || indeterminate;

    const checkboxBox = (
      <span className="relative inline-flex items-center justify-center shrink-0 cursor-pointer">
        <input
          type="checkbox"
          id={inputId}
          ref={internalRef}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-lg border transition-all duration-200 ease-in-out cursor-pointer select-none",
            "border-border/90 bg-white/80 shadow-2xs hover:border-primary/80",
            "dark:border-white/35 dark:bg-black/50 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] dark:hover:border-white/70",
            isCheckedOrIndeterminate &&
              "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30 dark:border-primary dark:bg-primary dark:text-primary-foreground dark:shadow-[0_0_10px_rgba(218,241,222,0.35)]",
            disabled &&
              "cursor-not-allowed opacity-40 border-muted-foreground/30 bg-muted/40",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-primary/25 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
            className,
          )}
        >
          {indeterminate ? (
            <Minus className="h-3.5 w-3.5 stroke-[3.5] text-primary-foreground animate-in zoom-in-50 duration-150" />
          ) : checked ? (
            <Check className="h-3.5 w-3.5 stroke-[3.5] text-primary-foreground animate-in zoom-in-50 duration-150" />
          ) : null}
        </span>
      </span>
    );

    if (!label && !description) {
      return (
        <label htmlFor={inputId} className="cursor-pointer">
          {checkboxBox}
        </label>
      );
    }

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex items-center gap-2.5 text-sm cursor-pointer select-none",
          disabled && "cursor-not-allowed opacity-60",
          wrapperClassName,
        )}
      >
        {checkboxBox}
        <span className="flex flex-col gap-0.5 min-w-0">
          {label && (
            <span className="font-medium text-foreground leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
