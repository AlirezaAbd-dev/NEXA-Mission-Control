import { useEffect, useRef } from "react";
export function useMenuKeyboard(
  open: boolean,
  triggerId: string,
  menuId: string,
  onClose: () => void,
) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      const trigger = document.getElementById(triggerId),
        menu = document.getElementById(menuId);
      if (
        !menu ||
        !(
          trigger?.contains(event.target as Node) ||
          menu.contains(event.target as Node)
        )
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close.current();
        trigger?.focus();
        return;
      }
      const items = Array.from(
        menu.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
      );
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const index = items.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : event.key === "ArrowDown"
                ? (index + 1) % items.length
                : (index - 1 + items.length) % items.length;
        items[next]?.focus();
      }
      if (event.key === "Tab") {
        close.current();
        trigger?.focus();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, triggerId, menuId]);
}
