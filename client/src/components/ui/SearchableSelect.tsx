/* eslint-disable react/set-state-in-effect -- Synchronizes cached asynchronous option labels using the frontend component contract. */
"use client";

import {
  useState,
  useId,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { useMenuKeyboard } from "./useMenuKeyboard";
import { HintTooltip } from "@/components/ui/tooltip";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  id?: string;
  ariaLabel?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SearchableSelectOption[];
  loadOptions?: (search: string) => Promise<SearchableSelectOption[]>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  clearable?: boolean;
  debounceMs?: number;
  initialLabel?: string;
}

export function SearchableSelect({
  id,
  ariaLabel,
  label,
  hint,
  error,
  required,
  disabled,
  options = [],
  loadOptions,
  value = "",
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
  clearable = true,
  debounceMs = 250,
  initialLabel,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [asyncOptions, setAsyncOptions] = useState<SearchableSelectOption[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [knownOptions, setKnownOptions] = useState<
    Record<string, SearchableSelectOption>
  >(() => {
    const init: Record<string, SearchableSelectOption> = {};
    if (value && initialLabel) {
      init[value] = { value, label: initialLabel };
    }
    for (const opt of options) {
      init[opt.value] = opt;
    }
    return init;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const defaultId = useId();
  const triggerId = id || defaultId;
  const listId = useId();

  // Update known options when static options change or value/initialLabel change
  useEffect(() => {
    if (options.length > 0) {
      setKnownOptions((prev) => {
        const next = { ...prev };
        for (const opt of options) {
          next[opt.value] = opt;
        }
        return next;
      });
    }
  }, [options]);

  useEffect(() => {
    if (value && initialLabel) {
      setKnownOptions((prev) => {
        if (!prev[value] || prev[value].label !== initialLabel) {
          return { ...prev, [value]: { value, label: initialLabel } };
        }
        return prev;
      });
    }
  }, [value, initialLabel]);

  // Async search loader with debounce
  useEffect(() => {
    if (!loadOptions || !isOpen) return;

    let active = true;
    setLoading(true);

    const timer = setTimeout(() => {
      loadOptions(search.trim())
        .then((res) => {
          if (!active) return;
          const items = Array.isArray(res) ? res : [];
          setAsyncOptions(items);
          setKnownOptions((prev) => {
            const next = { ...prev };
            for (const item of items) {
              next[item.value] = item;
            }
            return next;
          });
        })
        .catch(() => {
          if (!active) return;
          setAsyncOptions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, debounceMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadOptions, search, isOpen, debounceMs]);

  // Current active option list
  const currentOptions = useMemo(() => {
    if (loadOptions) {
      return asyncOptions;
    }
    if (!search.trim()) return options;
    const query = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(query)),
    );
  }, [loadOptions, asyncOptions, options, search]);

  const selectedOption = useMemo(
    () =>
      value
        ? knownOptions[value] ||
          options.find((opt) => opt.value === value) ||
          asyncOptions.find((opt) => opt.value === value)
        : undefined,
    [value, knownOptions, options, asyncOptions],
  );

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !document.getElementById(listId)?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, listId]);

  useMenuKeyboard(isOpen, triggerId, listId, () => setIsOpen(false));
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220 });
  useEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const rect = document.getElementById(triggerId)?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24);
      const height = Math.min(288, window.innerHeight - 24);
      setCoords({
        top: Math.max(
          12,
          Math.min(rect.bottom + 8, window.innerHeight - height - 12),
        ),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        width,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen, triggerId]);

  const handleSelect = (val: string, option?: SearchableSelectOption) => {
    if (option) {
      setKnownOptions((prev) => ({ ...prev, [val]: option }));
    }
    onChange?.(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={triggerId}
          className="text-xs sm:text-sm font-bold text-foreground/90 tracking-tight text-start inline-flex items-center gap-1.5"
        >
          <span>
            {typeof label === "string" ? label.replace(/\s*\*$/, "") : label}
          </span>
          {required && (
            <span className="text-danger font-bold text-xs" aria-hidden="true">
              *
            </span>
          )}
          {hint && <HintTooltip text={hint} />}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={triggerId}
          role="combobox"
          aria-label={
            ariaLabel ||
            (typeof label === "string"
              ? label
              : placeholder || "Select an option")
          }
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listId}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-xl sm:rounded-2xl border px-3.5 sm:px-4 text-sm sm:text-base font-normal outline-none transition-all duration-200 shadow-2xs cursor-pointer",
            "border-border/80 bg-card/80 text-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15",
            "dark:border-white/10 dark:bg-black/35 dark:text-foreground dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] dark:hover:border-white/20 dark:focus-visible:border-primary/80 dark:focus-visible:bg-black/50 dark:focus-visible:ring-4 dark:focus-visible:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40",
            !selectedOption && "text-muted-foreground/60 dark:text-white/30",
            error &&
              "border-danger focus-visible:border-danger focus-visible:ring-danger/20 dark:border-danger dark:focus-visible:border-danger dark:focus-visible:ring-danger/30",
          )}
        >
          <span className="min-w-0 truncate text-start font-medium text-foreground">
            {selectedOption
              ? selectedOption.label
              : placeholder || "Select an option…"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {clearable && selectedOption && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  handleClear(e as unknown as React.MouseEvent)
                }
                className="rounded-md p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
                aria-label={"Clear"}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180",
              )}
              aria-hidden
            />
          </div>
        </button>

        {isOpen &&
          createPortal(
            <div
              data-floating-overlay
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: coords.width,
                zIndex: 9999,
              }}
              id={listId}
              role="listbox"
              aria-labelledby={triggerId}
              className="max-h-72 w-full overflow-hidden rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl p-1.5 shadow-2xl shadow-primary/10 dark:border-white/12 dark:bg-[#06181b]/98 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] animate-in fade-in-50 zoom-in-95"
            >
              {/* Search Input */}
              <div className="relative mb-1.5 border-b border-border/60 dark:border-white/10 pb-1.5 px-1 pt-1">
                {loading ? (
                  <Loader2 className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-primary animate-spin" />
                ) : (
                  <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                )}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search options"
                  placeholder={searchPlaceholder || "Search…"}
                  className="h-9 w-full rounded-xl border border-border/60 bg-muted/30 ps-8 pe-3 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background transition-colors"
                />
              </div>

              {/* Options List */}
              <ul className="max-h-52 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-sidebar">
                {loading && currentOptions.length === 0 ? (
                  <li className="flex items-center justify-center gap-2 py-5 text-xs sm:text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>{"Loading…"}</span>
                  </li>
                ) : currentOptions.length === 0 ? (
                  <li className="py-4 text-center text-xs sm:text-sm text-muted-foreground">
                    {emptyMessage || "No results"}
                  </li>
                ) : (
                  currentOptions.map((opt) => (
                    <li key={opt.value} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={value === opt.value}
                        disabled={opt.disabled}
                        onClick={() => handleSelect(opt.value, opt)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start text-xs sm:text-sm transition-all duration-150 cursor-pointer",
                          value === opt.value
                            ? "bg-primary/12 font-bold text-primary dark:bg-primary/20 dark:text-primary"
                            : "text-foreground hover:bg-muted/70 dark:hover:bg-white/8",
                          opt.disabled && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <div className="min-w-0 flex flex-col">
                          <span className="truncate">{opt.label}</span>
                          {opt.sublabel && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {opt.sublabel}
                            </span>
                          )}
                        </div>
                        {value === opt.value && (
                          <Check
                            className="size-4 shrink-0 text-primary"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>,
            document.body,
          )}
      </div>

      {error && (
        <p className="text-xs font-semibold text-danger text-start">{error}</p>
      )}
    </div>
  );
}
