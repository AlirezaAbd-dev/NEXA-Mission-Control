import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomSelect } from "./CustomSelect";
import {
  calendarValue,
  parseCalendarValue,
  withinDateBounds,
} from "./calendarDates";

export interface DatePickerProps {
  id?: string;
  label?: string;
  value?: string | null;
  onChange?: (event: { target: { value: string } }) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  error?: string;
  type?: "date" | "datetime-local";
  min?: string;
  max?: string;
  triggerClassName?: string;
  ariaLabel?: string;
}
const EN_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatNumber = (
  n: number,
  _locale?: string,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat("en-US", options).format(n);
const numberLocale = "en-US";
const translations: Record<string, string> = {
  "common.selectDate": "Select date",
  "common.selectDateTime": "Select date and time",
  "common.clear": "Clear",
  "common.selectTime": "Time",
  "common.today": "Today",
  "common.done": "Done",
};
const t = (key: string, _fallback: string) => translations[key] || key;
function CalendarSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <CustomSelect
      value={String(value)}
      options={options.map((o) => ({ ...o, value: String(o.value) }))}
      onChange={onChange}
      ariaLabel={ariaLabel}
    />
  );
}

// Adapted from frontend/src/components/ui/date-picker.tsx; Gregorian only.
export function DatePicker({
  id,
  label,
  value,
  onChange,
  disabled,
  required,
  className,
  placeholder,
  error,
  type = "date",
  min,
  max,
  triggerClassName,
  ariaLabel,
}: DatePickerProps) {
  const generatedId = useId(),
    popoverId = useId();
  const inputId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null),
    popoverRef = useRef<HTMLDivElement>(null);
  const parsedDate = useMemo(() => parseCalendarValue(value), [value]);
  const [today, setToday] = useState(() => new Date());
  const base = parsedDate || today;
  const [viewYear, setViewYear] = useState(base.getFullYear()),
    [viewMonth, setViewMonth] = useState(base.getMonth() + 1);
  const [selectedHours, setSelectedHours] = useState(base.getHours()),
    [selectedMinutes, setSelectedMinutes] = useState(base.getMinutes());
  const [coords, setCoords] = useState({ top: 0, left: 0, isUp: false });
  const emitChange = (next: string) => onChange?.({ target: { value: next } });
  const close = () => {
    setIsOpen(false);
    document.getElementById(inputId)?.focus();
  };
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const now = new Date();
      setToday(now);
      const date = parseCalendarValue(value) || now;
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth() + 1);
      setSelectedHours(date.getHours());
      setSelectedMinutes(date.getMinutes());
      popoverRef.current
        ?.querySelector<HTMLButtonElement>(
          "[data-calendar-day]:not([disabled])",
        )
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, value]);
  useEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const height = Math.min(
          type === "datetime-local" ? 440 : 360,
          window.innerHeight - 24,
        ),
        width = Math.min(320, window.innerWidth - 24);
      const isUp =
        rect.bottom + height + 8 > window.innerHeight && rect.top > height;
      setCoords({
        top: Math.max(
          12,
          Math.min(
            isUp ? rect.top - height - 8 : rect.bottom + 8,
            window.innerHeight - height - 12,
          ),
        ),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        isUp,
      });
    };
    const outside = (event: PointerEvent) => {
      if (
        !containerRef.current?.contains(event.target as Node) &&
        !popoverRef.current?.contains(event.target as Node) &&
        !(event.target as Element).closest("[data-floating-overlay]")
      )
        setIsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !document.querySelector('[data-floating-overlay][role="listbox"]')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsOpen(false);
        document.getElementById(inputId)?.focus();
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [isOpen, type, inputId]);
  const formattedDisplayValue = parsedDate
    ? new Intl.DateTimeFormat("en-US", {
        calendar: "gregory",
        year: "numeric",
        month: "short",
        day: "numeric",
        ...(type === "datetime-local"
          ? { hour: "2-digit", minute: "2-digit" }
          : {}),
      }).format(parsedDate)
    : "";
  const select = (date: Date) => {
    if (!withinDateBounds(date, min, max, type === "datetime-local")) return;
    emitChange(calendarValue(date, type === "datetime-local"));
    if (type === "date") close();
  };
  const handleSelectDay = (day: number) =>
    select(
      new Date(viewYear, viewMonth - 1, day, selectedHours, selectedMinutes),
    );
  const handleTimeChange = (hour: number, minute: number) => {
    setSelectedHours(hour);
    setSelectedMinutes(minute);
    if (parsedDate) {
      const next = new Date(parsedDate);
      next.setHours(hour, minute, 0, 0);
      select(next);
    }
  };
  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    emitChange("");
    close();
  };
  const handleToday = () => {
    select(new Date());
    close();
  };
  const prevMonth = () => {
    const date = new Date(viewYear, viewMonth - 2, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  };
  const nextMonth = () => {
    const date = new Date(viewYear, viewMonth, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  };
  const monthName = EN_MONTH_NAMES[viewMonth - 1];
  const calendarGrid = useMemo(() => {
    const now = calendarValue(today),
      selected = parsedDate ? calendarValue(parsedDate) : "";
    const days = Array.from(
      { length: new Date(viewYear, viewMonth - 1, 1).getDay() },
      () => ({
        day: 0,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false,
        disabled: true,
      }),
    );
    for (
      let day = 1;
      day <= new Date(viewYear, viewMonth, 0).getDate();
      day++
    ) {
      const date = new Date(
          viewYear,
          viewMonth - 1,
          day,
          selectedHours,
          selectedMinutes,
        ),
        dateValue = calendarValue(date);
      days.push({
        day,
        isCurrentMonth: true,
        isSelected: dateValue === selected,
        isToday: dateValue === now,
        disabled: !withinDateBounds(date, min, max, type === "datetime-local"),
      });
    }
    return days;
  }, [
    viewYear,
    viewMonth,
    today,
    parsedDate,
    min,
    max,
    type,
    selectedHours,
    selectedMinutes,
  ]);
  const handleCalendarKey = (event: React.KeyboardEvent) => {
    const day = Number(
      (event.target as HTMLElement).getAttribute("data-calendar-day"),
    );
    if (
      !day ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const offset =
      { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key] ||
      0;
    popoverRef.current
      ?.querySelector<HTMLButtonElement>(
        '[data-calendar-day="' + (day + offset) + '"]:not([disabled])',
      )
      ?.focus();
  };
  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-col gap-1.5", className)}
    >
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs sm:text-sm font-bold text-foreground/90 tracking-tight"
        >
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={inputId}
          data-date-trigger
          aria-label={ariaLabel || label || placeholder || "Select date"}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={popoverId}
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-xl sm:rounded-2xl border px-3.5 sm:px-4 text-sm sm:text-base font-normal outline-none transition-all duration-200 shadow-2xs cursor-pointer",
            "border-border/80 bg-card/80 text-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15",
            "dark:border-white/10 dark:bg-black/35 dark:text-foreground dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] dark:hover:border-white/20 dark:focus-visible:border-primary/80 dark:focus-visible:bg-black/50 dark:focus-visible:ring-4 dark:focus-visible:ring-primary/20",
            disabled && "cursor-not-allowed opacity-50 bg-muted/40",
            error &&
              "border-danger focus-visible:border-danger focus-visible:ring-danger/20 dark:border-danger dark:focus-visible:border-danger dark:focus-visible:ring-danger/30",
            !formattedDisplayValue &&
              "text-muted-foreground/60 dark:text-white/30 font-normal",
            triggerClassName,
          )}
        >
          <span className="truncate font-medium">
            {formattedDisplayValue ||
              placeholder ||
              (type === "datetime-local"
                ? t("common.selectDateTime", "انتخاب تاریخ و ساعت")
                : t("common.selectDate", "انتخاب تاریخ"))}
          </span>
          <div className="flex items-center gap-1.5">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground cursor-pointer transition-colors"
                aria-label="Clear date"
                title="Clear date"
              >
                <X className="h-4 w-4" />
              </span>
            )}
            <CalendarIcon className="h-4.5 w-4.5 text-muted-foreground/80 shrink-0" />
          </div>
        </button>
      </div>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: Math.min(320, window.innerWidth - 24),
              zIndex: 9999,
            }}
          >
            <div
              ref={popoverRef}
              id={popoverId}
              data-floating-overlay
              role="dialog"
              aria-label="Choose Gregorian date"
              onKeyDown={handleCalendarKey}
              className={cn(
                "absolute start-0 w-full max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl sm:rounded-3xl border border-border/80 bg-card/98 text-foreground p-4 shadow-2xl shadow-primary/10 backdrop-blur-2xl animate-in fade-in-50 zoom-in-95 duration-150 dark:border-white/12 dark:bg-[#06181b]/98 dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)]",
                coords.isUp ? "origin-bottom" : "origin-top",
              )}
              dir="ltr"
            >
              {/* Header Month / Year controls */}
              <div className="mb-3.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground hover:bg-muted dark:border-white/10 dark:bg-black/40 dark:hover:bg-white/10 hover:text-foreground cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </button>
                <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <span>{monthName}</span>
                  <span className="text-primary font-extrabold">
                    {formatNumber(viewYear, numberLocale, {
                      useGrouping: false,
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground hover:bg-muted dark:border-white/10 dark:bg-black/40 dark:hover:bg-white/10 hover:text-foreground cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold text-muted-foreground/70">
                {weekdays.map((wd, i) => (
                  <div key={i} className="py-1">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm">
                {calendarGrid.map((item, idx) => {
                  if (!item.isCurrentMonth) {
                    return <div key={idx} className="h-8 w-8 sm:h-9 sm:w-9" />;
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDay(item.day)}
                      disabled={item.disabled}
                      aria-label={new Date(
                        viewYear,
                        viewMonth - 1,
                        item.day,
                      ).toLocaleDateString("en-US", { dateStyle: "full" })}
                      aria-pressed={item.isSelected}
                      data-calendar-day={item.day}
                      className={cn(
                        "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl font-semibold transition-all duration-150 mx-auto cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
                        item.isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 scale-105"
                          : item.isToday
                            ? "border-2 border-primary/70 text-primary font-bold hover:bg-primary/15"
                            : "text-foreground hover:bg-muted/80 dark:hover:bg-white/10 hover:text-foreground active:scale-95",
                      )}
                    >
                      {formatNumber(item.day, numberLocale)}
                    </button>
                  );
                })}
              </div>

              {/* Time Picker Section (if datetime-local) */}
              {type === "datetime-local" && (
                <div className="mt-3.5 border-t border-border/60 dark:border-white/10 pt-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{t("common.selectTime", "ساعت")}</span>
                    </div>
                    <div className="flex items-center gap-1.5" dir="ltr">
                      <CalendarSelect
                        value={selectedHours}

                        ariaLabel="Hour"
                        options={Array.from({ length: 24 }).map((_, h) => ({
                          value: h,
                          label: pad2(h),
                        }))}
                        onChange={(val) =>
                          handleTimeChange(Number(val), selectedMinutes)
                        }
                      />
                      <span className="font-bold text-muted-foreground">:</span>
                      <CalendarSelect
                        value={selectedMinutes}

                        ariaLabel="Minute"
                        options={Array.from({ length: 12 }).map((_, m) => ({
                          value: m * 5,
                          label: pad2(m * 5),
                        }))}
                        onChange={(val) =>
                          handleTimeChange(selectedHours, Number(val))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="mt-3.5 flex items-center justify-between border-t border-border/60 dark:border-white/10 pt-2.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={handleToday}
                  disabled={
                    !withinDateBounds(
                      today,
                      min,
                      max,
                      type === "datetime-local",
                    )
                  }
                  className="text-primary hover:underline hover:text-primary/80 font-bold transition-colors cursor-pointer"
                >
                  {t("common.today", "امروز")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {t("common.done", "بستن")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {error && (
        <span className="text-xs font-semibold text-danger">{error}</span>
      )}
    </div>
  );
}

export function DateTimePicker(props: Omit<DatePickerProps, "type">) {
  return <DatePicker {...props} type="datetime-local" />;
}
