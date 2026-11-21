// Canonical adapter of frontend/src/components/mobile-ui/DirectionalIcon.tsx.
import type { ComponentType, HTMLAttributes } from "react";
export function DirectionalIcon({ icon: Icon, size = 18, className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { icon: ComponentType<{ size?: number | string; className?: string }>; size?: number | string }) {
  return <span className={"inline-flex shrink-0 items-center justify-center rtl:-scale-x-100 " + className} {...props}><Icon size={size} className="max-h-full max-w-full" /></span>;
}
