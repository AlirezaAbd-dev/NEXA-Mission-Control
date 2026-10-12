"use client";

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMenuKeyboard } from "./useMenuKeyboard";
import { HintTooltip } from "@/components/ui/tooltip";

/* ─── Context ─────────────────────────────────────────────────────────────── */

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  contentId: string;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const ctx = useContext(DropdownContext);
  if (!ctx)
    throw new Error("Dropdown components must be used within <Dropdown>");
  return ctx;
}

/* ─── Primitives ──────────────────────────────────────────────────────────── */

export function Dropdown({
  children,
  open: controlledOpen,
  onOpenChange,
  className,
}: {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (controlledOpen === undefined) setInternalOpen(next);
    },
    [controlledOpen, onOpenChange],
  );
  const triggerId = useId();
  const contentId = useId();

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerId, contentId }}>
      <div className={cn("relative", className)}>{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  children,
  className,
  showChevron = true,
  chevronClassName,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  showChevron?: boolean;
  chevronClassName?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const { open, setOpen, triggerId, contentId } = useDropdownContext();

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={contentId}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => setOpen(!open)}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl cursor-pointer border px-3 py-2 text-sm font-medium transition-all duration-200 outline-none shadow-2xs",
        "border-slate-200/90 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-600/15",
        "dark:border-white/10 dark:bg-black/35 dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-black/50 dark:focus-visible:ring-teal-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
      {showChevron && (
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
            chevronClassName,
          )}
          aria-hidden
        />
      )}
    </button>
  );
}

export function DropdownBackdrop() {
  const { setOpen } = useDropdownContext();
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label="Close dropdown"
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-40 cursor-default bg-transparent"
    />
  );
}

export function DropdownContent({
  children,
  className,
  align = "end",
  minWidth,
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
  minWidth?: string;
}) {
  const { open, setOpen, contentId, triggerId } = useDropdownContext();
  useMenuKeyboard(open, triggerId, contentId, () => setOpen(false));
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: -9999, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: PointerEvent) => {
      const trigger = document.getElementById(triggerId);
      const content = document.getElementById(contentId);
      if (
        trigger &&
        content &&
        !trigger.contains(event.target as Node) &&
        !content.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [open, triggerId, contentId, setOpen]);

  useEffect(() => {
    if (!open) return;
    const trigger = document.getElementById(triggerId);
    if (!trigger) return;

    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      const menu = document.getElementById(contentId);
      const gutter = 12;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const menuWidth = Math.min(
        className?.split(/\s+/).includes("w-full")
          ? Math.max(
              rect.width,
              menu ? parseFloat(getComputedStyle(menu).minWidth) || 0 : 0,
            )
          : menu?.offsetWidth || rect.width,
        viewportWidth - gutter * 2,
      );
      const menuHeight = Math.min(
        menu?.offsetHeight || 0,
        viewportHeight - gutter * 2,
      );
      const rtl = getComputedStyle(trigger).direction === "rtl";
      const desiredLeft =
        align === "center"
          ? rect.left + (rect.width - menuWidth) / 2
          : (align === "start") !== rtl
            ? rect.left
            : rect.right - menuWidth;
      const below = rect.bottom + 8;
      const above = rect.top - menuHeight - 8;
      const desiredTop =
        below + menuHeight > viewportHeight - gutter && above >= gutter
          ? above
          : below;
      setCoords({
        top: Math.max(
          gutter,
          Math.min(desiredTop, viewportHeight - menuHeight - gutter),
        ),
        left: Math.max(
          gutter,
          Math.min(desiredLeft, viewportWidth - menuWidth - gutter),
        ),
        width: menuWidth,
      });
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    const menu = document.getElementById(contentId);
    if (menu) observer.observe(menu);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
    };
  }, [open, triggerId, contentId, align, className]);

  if (!open) return null;

  const content = (
    <div
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
      }}
    >
      <div
        id={contentId}
        data-floating-overlay
        role="menu"
        aria-labelledby={triggerId}
        style={{
          minWidth: minWidth
            ? `min(${minWidth}, calc(100vw - 24px))`
            : undefined,
          maxWidth: "calc(100vw - 24px)",
          maxHeight: "calc(100dvh - 24px)",
          overflowY: "auto",
        }}
        className={cn(
          "absolute top-0 start-0 z-50 min-w-44 rounded-xl border border-slate-200/90 bg-white/98 text-slate-900 shadow-xl shadow-slate-900/10",
          "dark:border-white/12 dark:bg-[#06181b]/95 dark:text-slate-100 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)]",
          "animate-in fade-in-50 zoom-in-95 duration-150 scrollbar-thin scrollbar-sidebar",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}

export function DropdownItem({
  children,
  className,
  onClick,
  disabled,
  danger,
  selected,
  variant = "default",
  closeOnSelect = true,
  icon: Icon,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  selected?: boolean;
  variant?: "default" | "danger";
  closeOnSelect?: boolean;
  icon?: typeof Check;
}) {
  const { setOpen } = useDropdownContext();
  const isDanger = danger || variant === "danger";

  return (
    <button
      type="button"
      role={selected === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={selected}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        if (closeOnSelect) setOpen(false);
      }}
      className={cn(
        "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-start text-sm font-medium transition-colors cursor-pointer",
        isDanger
          ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          : selected
            ? "bg-teal-50 font-semibold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/8 dark:hover:text-white",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
        <span className="min-w-0 truncate">{children}</span>
      </div>
      {selected && (
        <Check className="size-4 shrink-0 text-primary" aria-hidden />
      )}
    </button>
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-border/60 dark:bg-white/10", className)}
    />
  );
}

export function DropdownLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownLinkItem({
  children,
  href,
  className,
  icon: Icon,
}: {
  children: ReactNode;
  href: string;
  className?: string;
  icon?: typeof Check;
}) {
  const { setOpen } = useDropdownContext();

  return (
    <Link
      to={href}
      role="menuitem"
      onClick={() => setOpen(false)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-sm font-medium text-foreground transition-colors hover:bg-muted/80 dark:hover:bg-white/8",
        className,
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}

export { DropdownLinkItem as DropdownLink };

/* ─── High-Level Select Component ─────────────────────────────────────────── */

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function SelectOption(_props: {
  value: string;
  label?: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return null;
}

function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean")
    return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return props.children ? nodeToText(props.children) : "";
  }
  return "";
}

function parseOptionChildren(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as {
      value?: string;
      label?: string;
      disabled?: boolean;
      children?: ReactNode;
    };
    if (props.value === undefined) return;
    const extractedText = nodeToText(props.children);
    const textLabel =
      props.label ?? (extractedText.trim() ? extractedText : props.value);
    options.push({
      value: props.value,
      label: String(textLabel),
      disabled: props.disabled,
    });
  });
  return options;
}

export function Select({
  className,
  triggerClassName,
  label,
  hint,
  error,
  children,
  options: optionsProp,
  value = "",
  onChange,
  disabled,
  required,
  placeholder,
  "aria-label": ariaLabel,
  size = "default",
}: {
  className?: string;
  triggerClassName?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  children?: ReactNode;
  options?: SelectOption[];
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const listId = useId();

  const options = useMemo(
    () => optionsProp ?? parseOptionChildren(children),
    [optionsProp, children],
  );

  const selected = options.find((opt) => opt.value === value);
  const displayLabel = selected?.label ?? placeholder ?? "";

  const handleSelect = (next: string) => {
    onChange?.({ target: { value: next } });
    setOpen(false);
  };

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    isUp?: boolean;
  }>({ top: -9999, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const trigger = document.getElementById(triggerId);
    if (!trigger) return;

    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = 250;
      const shouldOpenUp =
        spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

      setCoords({
        top: shouldOpenUp ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        isUp: shouldOpenUp,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, triggerId]);

  useMenuKeyboard(open, triggerId, listId, () => setOpen(false));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
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
          aria-label={
            ariaLabel ?? (typeof label === "string" ? label : undefined)
          }
          aria-expanded={open}
          role="combobox"
          aria-haspopup="listbox"
          aria-controls={listId}
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={cn(
            "flex w-full items-center justify-between gap-2 border font-normal outline-none transition-all duration-200 shadow-2xs cursor-pointer",
            size === "sm"
              ? "h-8.5 rounded-lg px-2.5 text-xs"
              : "h-11 rounded-xl sm:rounded-2xl px-3.5 sm:px-4 text-sm sm:text-base",
            "border-slate-200/90 bg-white text-slate-900 hover:border-slate-300 focus-visible:border-teal-600 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal-600/15",
            "dark:border-[#183035] dark:bg-[#070e10]/60 dark:text-slate-100 dark:hover:border-teal-500/30 dark:focus-visible:border-teal-400 dark:focus-visible:bg-[#0a1518] dark:focus-visible:ring-teal-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-muted/40",
            !selected && placeholder && "text-slate-400 dark:text-slate-500",
            error &&
              "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
            triggerClassName,
          )}
        >
          <span className="min-w-0 truncate text-start font-medium">
            {displayLabel}
          </span>
          <ChevronDown
            className={cn(
              "shrink-0 text-slate-400 dark:text-muted-foreground transition-transform duration-200",
              size === "sm" ? "size-3.5" : "size-4",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {open &&
          (typeof document !== "undefined"
            ? createPortal(
                <div
                  style={{
                    position: "fixed",
                    top: coords.top,
                    left: coords.left,
                    width: Math.max(coords.width, 140),
                    zIndex: 9999,
                  }}
                >
                  <button
                    type="button"
                    aria-label="Close"
                    className="fixed inset-0 z-40 cursor-default bg-transparent w-full h-full"
                    onClick={() => setOpen(false)}
                  />
                  <ul
                    id={listId}
                    data-floating-overlay
                    role="listbox"
                    aria-labelledby={triggerId}
                    className={cn(
                      "absolute z-50 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/98 text-slate-900 p-1.5 shadow-2xl shadow-slate-900/10 dark:border-white/12 dark:bg-[#06181b]/98 dark:text-slate-100 dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] animate-in fade-in-50 zoom-in-95 scrollbar-thin scrollbar-sidebar",
                      coords.isUp ? "bottom-0 mb-2" : "top-0 mt-2",
                    )}
                  >
                    {options.map((opt) => (
                      <li key={opt.value} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={value === opt.value}
                          disabled={opt.disabled}
                          onClick={() => handleSelect(opt.value)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl transition-all duration-150 cursor-pointer",
                            size === "sm"
                              ? "px-2.5 py-1.5 text-xs"
                              : "px-3 py-2.5 text-sm",
                            value === opt.value
                              ? "bg-teal-50 font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/8 dark:hover:text-white",
                            opt.disabled && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <span className="min-w-0 truncate">{opt.label}</span>
                          {value === opt.value && (
                            <Check
                              className={cn(
                                "shrink-0 text-primary",
                                size === "sm" ? "size-3.5" : "size-4",
                              )}
                              aria-hidden
                            />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>,
                document.body,
              )
            : null)}
      </div>
      {error && (
        <p className="text-xs font-semibold text-danger text-start">{error}</p>
      )}
    </div>
  );
}
