import { tr, useUiLocale } from "@/i18n";
import React, { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { NativeBottomSheet } from "./NativeBottomSheet";

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
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
  className?: string;
  header?: React.ReactNode;
  contentClassName?: string;
  hideHeaderClose?: boolean;
  closeButtonClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
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
  initialFocusRef,
}: ModalProps) => {
  useUiLocale();
  const modalId = useId();
  const isMobile = useMobileViewport("(max-width: 1023px)");
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
    if (!isOpen || isMobile) return;
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
        (initialFocusRef?.current || focusable()[0] || dialogRef.current)?.focus();
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
  }, [isOpen, modalId, isMobile, initialFocusRef]);

  if (!isOpen) return null;
  if (isMobile) return <NativeBottomSheet open={isOpen} onClose={onClose} title={title} description={description} header={header} contentClassName={contentClassName} initialFocusRef={initialFocusRef}>{children}</NativeBottomSheet>;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-3xl",
    "3xl": "max-w-5xl",
    "4xl": "max-w-7xl",
    full: "w-[96vw] max-w-[1720px]",
  };

  return createPortal(
    <div
      style={{ zIndex: 50 + Math.max(0, stackPosition) * 10 }}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 md:backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || tr("Task details")}
        data-nexa-modal-card=""
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full min-w-0 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl bg-[var(--nexa-surface-l1)] text-foreground shadow-2xl animate-in zoom-in-95 duration-200",
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
            data-nexa-modal-close=""
            className={cn(
              "absolute top-4 end-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nexa-surface-l2)] text-muted-foreground hover:text-foreground hover:bg-[var(--nexa-surface-hover)] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--nexa-focus-outer)]",
              closeButtonClassName,
            )}
            aria-label={tr("Close modal")}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {(title || description) && (
          <div
            data-nexa-modal-header=""
            className="shrink-0 border-b border-[var(--nexa-divider)] bg-[var(--nexa-surface-l1)] px-6 py-4 pe-16"
          >
            {title && (
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
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
