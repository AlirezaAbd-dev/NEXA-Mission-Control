// Adapted from frontend/src/components/mobile-ui/NativeBottomSheet.tsx.
// Reuses the workspace's Vaul drawer pattern and Mission Control's theme/Button.
import { useState, type ReactNode, type RefObject } from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { Button } from "./Button";
import { tr, useUiLocale } from "@/i18n";
import { cn } from "@/lib/utils";
let nextLayer = 100;
export function NativeBottomSheet({ open, onClose, title, description, header, children, contentClassName = "", initialFocusRef }: { open: boolean; onClose: () => void; title?: ReactNode; description?: ReactNode; header?: ReactNode; children: ReactNode; contentClassName?: string; initialFocusRef?: RefObject<HTMLElement | null> }) {
  useUiLocale();
  const [layer] = useState(() => nextLayer += 2);
  return <Drawer.Root open={open} onOpenChange={value => { if (!value) onClose(); }} repositionInputs shouldScaleBackground={false}>
    <Drawer.Portal>
      <Drawer.Overlay style={{ zIndex: layer }} className="fixed inset-0 bg-black/60 backdrop-blur-md" />
      <Drawer.Content onOpenAutoFocus={event => {
        if (!initialFocusRef?.current) return;
        event.preventDefault();
        initialFocusRef.current.focus({ preventScroll: true });
      }} style={{ zIndex: layer + 1 }} data-native-sheet data-nexa-sheet="" className={cn("fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-[var(--nexa-divider)] bg-[var(--nexa-surface-l1)] text-foreground outline-none", header && "h-[92dvh]")} aria-describedby={undefined}>
        <div className="mx-auto mt-3 mb-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/40" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 border-b border-border">
          <div className="min-w-0"><Drawer.Title className={header ? "sr-only" : "font-semibold text-base leading-relaxed"}>{title || tr("Task details")}</Drawer.Title>{description && <Drawer.Description className="text-sm text-muted-foreground mt-1">{description}</Drawer.Description>}</div>
          {!header && <Button variant="ghost" size="icon" aria-label={tr("Close modal")} onClick={onClose}><X size={18} /></Button>}
        </div>
        {header && <div className="shrink-0">{header}</div>}
        <div data-vaul-no-drag className={cn("min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]", contentClassName)}>{children}</div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>;
}
