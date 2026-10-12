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
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "min-h-24 w-full rounded-xl sm:rounded-2xl border px-3.5 sm:px-4 py-3 text-sm sm:text-base font-normal outline-none transition-all duration-200 shadow-2xs",
          "border-slate-200/90 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10",
          "dark:border-white/10 dark:bg-black/35 dark:text-slate-100 dark:placeholder:text-white/30 dark:focus:border-teal-400 dark:focus:bg-black/50 dark:focus:ring-teal-500/20",
          error &&
            "border-rose-500 dark:border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-500/5",
          className,
        )}
        {...props}
      />
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 font-medium animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
