"use client";

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "./DatePicker";
import { HintTooltip } from "@/components/ui/tooltip";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  leadingAddon?: React.ReactNode;
  trailingAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hint,
      error,
      type,
      id,
      icon: Icon,
      leadingAddon,
      trailingAddon,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const internalRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => internalRef.current!);

    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const isNumber = type === "number";
    const inputType = isPassword && showPassword ? "text" : type;

    const handleStep = (direction: "up" | "down") => {
      const input = internalRef.current;
      if (!input || props.disabled || props.readOnly) return;

      const step = Number(props.step) || 1;
      const min =
        props.min !== undefined && props.min !== ""
          ? Number(props.min)
          : -Infinity;
      const max =
        props.max !== undefined && props.max !== ""
          ? Number(props.max)
          : Infinity;
      const currentVal = input.value === "" ? 0 : Number(input.value);

      let nextVal = direction === "up" ? currentVal + step : currentVal - step;
      if (props.step && String(props.step).includes(".")) {
        const decimals = String(props.step).split(".")[1].length;
        nextVal = Number(nextVal.toFixed(decimals));
      }

      if (nextVal < min) nextVal = min;
      if (nextVal > max) nextVal = max;

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, String(nextVal));
      } else {
        input.value = String(nextVal);
      }

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const hasLeading = Boolean(Icon || leadingAddon);
    const hasTrailing = Boolean(isPassword || trailingAddon || isNumber);
    const containerDir = props.dir ?? (isPassword ? "ltr" : undefined);

    if (type === "date" || type === "datetime-local")
      return (
        <DatePicker
          id={inputId}
          label={label}
          value={String(props.value || "")}
          onChange={(e) =>
            props.onChange?.(e as React.ChangeEvent<HTMLInputElement>)
          }
          type={type === "date" ? "date" : "datetime-local"}
          disabled={props.disabled}
          required={props.required}
          min={props.min === undefined ? undefined : String(props.min)}
          max={props.max === undefined ? undefined : String(props.max)}
          error={error}
          className={className}
          ariaLabel={props["aria-label"]}
          placeholder={props.placeholder}
        />
      );
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-tight text-start inline-flex items-center gap-1.5"
          >
            <span>
              {typeof label === "string" ? label.replace(/\s*\*$/, "") : label}
            </span>
            {props.required && (
              <span
                className="text-rose-500 font-bold text-xs"
                aria-hidden="true"
              >
                *
              </span>
            )}
            {hint && <HintTooltip text={hint} />}
          </label>
        )}
        <div
          dir={containerDir}
          className={cn(
            "group relative flex items-center w-full h-11 rounded-xl sm:rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden",
            "border-slate-200/90 bg-white text-slate-900 hover:border-slate-300 focus-within:border-teal-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-600/10",
            "dark:border-white/10 dark:bg-black/35 dark:text-slate-100 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] dark:hover:border-white/20 dark:focus-within:border-teal-400 dark:focus-within:bg-black/50 dark:focus-within:ring-4 dark:focus-within:ring-teal-500/20",
            props.disabled && "cursor-not-allowed opacity-50 bg-slate-100 dark:bg-muted/40",
            error &&
              "border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500/15 dark:border-rose-500 dark:focus-within:border-rose-500 dark:focus-within:ring-rose-500/25",
          )}
        >
          {Icon && (
            <div className="ps-4 pe-2 text-slate-400 group-focus-within:text-teal-600 dark:text-muted-foreground/80 dark:group-focus-within:text-teal-400 transition-colors flex items-center justify-center shrink-0 pointer-events-none">
              <Icon className="h-4.5 w-4.5" />
            </div>
          )}
          {leadingAddon && (
            <div className="ps-4 pe-2 flex items-center shrink-0">
              {leadingAddon}
            </div>
          )}
          <input
            ref={internalRef}
            type={inputType}
            id={inputId}
            className={cn(
              "h-full w-full flex-1 bg-transparent text-sm sm:text-base font-normal outline-none border-0 ring-0 focus:ring-0 focus:outline-none text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-white/30",
              hasLeading ? "ps-1.5" : "ps-4",
              hasTrailing ? "pe-1.5" : "pe-4",
              isPassword && "text-left",
              "disabled:cursor-not-allowed",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              className,
            )}
            {...props}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={
              [props["aria-describedby"], error ? errorId : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
          />
          {trailingAddon && (
            <div className="ps-2 pe-4 flex items-center shrink-0">
              {trailingAddon}
            </div>
          )}
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="ps-2 pe-4 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4.5 w-4.5" aria-hidden />
              ) : (
                <Eye className="h-4.5 w-4.5" aria-hidden />
              )}
            </button>
          )}
          {isNumber && !props.disabled && !props.readOnly && (
            <div className="pe-2 ps-1 flex flex-col justify-center items-center h-8 w-6 shrink-0">
              <div className="flex flex-col justify-center items-center h-full w-full rounded-lg border border-border/70 bg-card/90 dark:border-white/10 dark:bg-black/60 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleStep("up")}
                  className="flex-1 w-full flex items-center justify-center hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  aria-label="Increase"
                >
                  <ChevronUp className="h-3 w-3 stroke-[2.5]" />
                </button>
                <div className="w-full h-px bg-border/60 dark:bg-white/10" />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleStep("down")}
                  className="flex-1 w-full flex items-center justify-center hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  aria-label="Decrease"
                >
                  <ChevronDown className="h-3 w-3 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="text-xs font-semibold text-danger text-start"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
