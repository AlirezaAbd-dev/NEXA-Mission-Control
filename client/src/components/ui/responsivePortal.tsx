import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { NativeBottomSheet } from "./NativeBottomSheet";
// The canonical responsive dialog/sheet pattern shared by floating controls.
export function responsivePortal(children: ReactNode, container: Element, isMobile: boolean, onClose: () => void, title: string, contentClassName?: string) {
  return isMobile ? <NativeBottomSheet open onClose={onClose} title={title} contentClassName={contentClassName}><div data-mobile-popup>{children}</div></NativeBottomSheet> : createPortal(children, container);
}
