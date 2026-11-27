import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = ({
  className,
  error,
  label,
  id,
  ref,
  ...props
}: TextareaProps & { ref?: React.Ref<HTMLTextAreaElement> }) => {
  return (
    <div className="flex min-w-0 flex-col gap-2 w-full">
      {label && (
        <label
          htmlFor={id}
          className="text-field-label font-medium text-foreground text-start inline-flex items-center gap-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        dir="auto"
        ref={ref}
        id={id}
        data-nexa-field=""
        data-invalid={error ? "true" : undefined}
        className={cn(
          "min-h-24 w-full rounded-xl border px-3.5 sm:px-4 py-3 text-sm sm:text-base font-normal outline-none transition-all duration-200",
          "bg-[var(--nexa-field-fill)] border-[var(--nexa-field-border)] text-foreground placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-danger font-medium animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
