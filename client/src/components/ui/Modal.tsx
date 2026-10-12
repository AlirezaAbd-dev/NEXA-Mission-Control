import React, { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

const modalStack: string[] = [];
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notifyStack() {
  for (const listener of listeners) listener();
}
let previousBodyOverflow = "";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  header?: React.ReactNode;
  contentClassName?: string;
  hideHeaderClose?: boolean;
  closeButtonClassName?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
  header,
  contentClassName,
  hideHeaderClose = false,
  closeButtonClassName,
}: ModalProps) => {
  const modalId = useId();
  const stackPosition = useSyncExternalStore(
    subscribe,
    () => modalStack.indexOf(modalId),
    () => -1,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (modalStack.length === 0)
      previousBodyOverflow = document.body.style.overflow;
    modalStack.push(modalId);
    notifyStack();
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]',
        ) || [],
      ).filter((e) => e.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => {
      if (modalStack.at(-1) === modalId)
        (focusable()[0] || dialogRef.current)?.focus();
    });
    const handler = (e: KeyboardEvent) => {
      if (modalStack.at(-1) !== modalId) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeRef.current();
      }
      if (e.key === "Tab") {
        if ((e.target as Element).closest("[data-floating-overlay]")) return;
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !dialogRef.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !dialogRef.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handler);
      const index = modalStack.indexOf(modalId);
      if (index >= 0) modalStack.splice(index, 1);
      notifyStack();
      if (modalStack.length === 0)
        document.body.style.overflow = previousBodyOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, modalId]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-3xl",
  };

  return createPortal(
    <div
      style={{ zIndex: 50 + Math.max(0, stackPosition) * 10 }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Task details"}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full min-w-0 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#183035] bg-white dark:bg-[#0a1518] shadow-2xl shadow-slate-900/10 dark:shadow-black/70 animate-in zoom-in-95 duration-200",
          sizeClasses[size],
          className,
        )}
      >
        {header && <div className="relative z-20 shrink-0">{header}</div>}
        {/* Floating Top-Right Close Button */}
        {!hideHeaderClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "absolute top-4 end-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 dark:border-[#183035] bg-white dark:bg-[#132428] text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#183035] transition-all cursor-pointer focus:ring-2 focus:ring-teal-500/40",
              closeButtonClassName,
            )}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {(title || description) && (
          <div className="shrink-0 border-b border-slate-100 dark:border-[#183035] bg-slate-50/70 dark:bg-[#0d1a1d]/80 px-6 py-4 pe-16">
            {title && (
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}

        <div
          className={cn(
            "min-h-0 flex-auto overflow-y-auto overflow-x-hidden overscroll-contain p-5 sm:p-6",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};
