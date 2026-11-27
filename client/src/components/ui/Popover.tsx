import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

export const Popover = ({
  trigger,
  children,
  align = "left",
  className,
}: PopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handlePointerDownOutside);
      document.addEventListener("touchstart", handlePointerDownOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [isOpen]);

  const alignClasses = {
    left: "start-0",
    right: "end-0",
    center: "left-1/2 -translate-x-1/2",
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          data-nexa-popup-surface=""
          className={cn(
            "absolute z-50 mt-2 p-3 bg-[var(--nexa-popup-fill)] text-foreground rounded-xl animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100vw-2rem)]",
            alignClasses[align],
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
