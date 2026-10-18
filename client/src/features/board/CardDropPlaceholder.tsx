import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function CardDropPlaceholder() {
  const anchor = useRef<HTMLDivElement>(null);
  const [bounds,setBounds] = useState<{top:number;left:number;width:number} | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const rect=anchor.current?.getBoundingClientRect();
      if(rect)setBounds({top:rect.top-6,left:rect.left,width:rect.width});
    };
    place();
    window.addEventListener("scroll",place,true);
    window.addEventListener("resize",place);
    return () => {
      window.removeEventListener("scroll",place,true);
      window.removeEventListener("resize",place);
    };
  },[]);
  return <>
    <div ref={anchor} className="h-0 pointer-events-none" />
    {bounds && createPortal(
      <div className="fixed z-[1100] flex items-center gap-2 pointer-events-none" style={bounds}
        role="status" aria-label="Drop task here" data-card-drop-placeholder>
        <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        <span className="h-1 flex-1 rounded-full bg-primary shadow-sm" />
        <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-app-surface shadow-sm">Drop here</span>
      </div>,
      document.body,
    )}
  </>;
}
