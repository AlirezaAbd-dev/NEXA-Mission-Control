"use client";

import {
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function Tooltip({
  content,
  children,
  className,
  side = "top",
  align = "start",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const mounted = true;
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualSide: "top" | "bottom";
  } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isRtl =
      typeof document !== "undefined" &&
      (document.documentElement.dir === "rtl" || document.dir === "rtl");

    // Auto flip if there isn't enough space on top (e.g. inside a modal near header)
    let actualSide: "top" | "bottom" = side === "bottom" ? "bottom" : "top";
    if (actualSide === "top" && rect.top < 110) {
      actualSide = "bottom";
    } else if (
      actualSide === "bottom" &&
      window.innerHeight - rect.bottom < 110
    ) {
      actualSide = "top";
    }

    const gap = 8;
    const top = actualSide === "top" ? rect.top - gap : rect.bottom + gap;
    let left = rect.left + rect.width / 2;

    if (align === "start") {
      left = isRtl ? rect.right : rect.left;
    } else if (align === "end") {
      left = isRtl ? rect.left : rect.right;
    }

    setCoords({ top, left, actualSide });
  }, [side, align]);

  useEffect(() => {
    if (!visible) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [visible, updatePosition]);

  if (!content) return <>{children}</>;

  const isRtl =
    mounted &&
    (document.documentElement.dir === "rtl" || document.dir === "rtl");

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex items-center"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        tabIndex={0}
        role="button"
        aria-describedby={visible ? tooltipId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setVisible((prev) => !prev);
        }}
      >
        {children}
      </div>

      {mounted &&
        visible &&
        coords &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              top: coords.top,
              left: coords.left,
              transform:
                coords.actualSide === "top"
                  ? align === "center"
                    ? "translate(-50%, -100%)"
                    : align === "start"
                      ? isRtl
                        ? "translate(-100%, -100%)"
                        : "translate(0%, -100%)"
                      : isRtl
                        ? "translate(0%, -100%)"
                        : "translate(-100%, -100%)"
                  : align === "center"
                    ? "translate(-50%, 0%)"
                    : align === "start"
                      ? isRtl
                        ? "translate(-100%, 0%)"
                        : "translate(0%, 0%)"
                      : isRtl
                        ? "translate(0%, 0%)"
                        : "translate(-100%, 0%)",
            }}
            className={cn(
              "fixed z-[9999] min-w-48 max-w-xs rounded-xl border border-border/80 bg-popover/95 p-2.5 text-xs font-normal leading-relaxed text-popover-foreground shadow-2xl backdrop-blur-md dark:border-white/15 dark:bg-[#071b1e]/98 dark:text-gray-100 animate-in fade-in-50 zoom-in-95 pointer-events-none",
              className,
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

export function HintTooltip({
  text,
  className,
  iconClassName,
  side = "top",
  align = "start",
}: {
  text?: ReactNode;
  className?: string;
  iconClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  if (!text) return null;

  return (
    <Tooltip content={text} side={side} align={align} className={className}>
      <span
        className={cn(
          "inline-flex items-center justify-center text-muted-foreground/60 hover:text-primary transition-colors cursor-help p-0.5 rounded-full hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          iconClassName,
        )}
        aria-label="Help info"
      >
        <HelpCircle className="size-3.5" aria-hidden />
      </span>
    </Tooltip>
  );
}
