import { NativeBottomSheet } from "@/components/ui/NativeBottomSheet";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { tr, useUiLocale } from "@/i18n";
import { useUiStore } from "@/stores/ui.store";
import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/notification/useNotifications";
import { useMarkAllNotificationsRead } from "@/hooks/notification/useMarkAllNotificationsRead";
import { useMarkNotificationRead } from "@/hooks/notification/useMarkNotificationRead";
import { formatDateTime } from "@/lib/utils";

export const NotificationBell = () => {
  useUiLocale();
  const isMobile = useMobileViewport();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const panel = (
          <div ref={panelRef} className="fixed inset-x-2.5 top-14 mt-1.5 sm:absolute sm:inset-x-auto sm:end-0 sm:top-auto sm:mt-2 w-auto sm:w-80 max-h-[min(520px,calc(100dvh-5rem))] bg-white dark:bg-[#0b0c10] border border-slate-200/90 dark:border-white/[0.06] rounded-2xl shadow-2xl p-4 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{tr("Notifications (")}{unreadCount})
              </h4>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />{tr("Mark all read")}</button>
              )}
            </div>

            <div className="flex-1 max-h-[min(380px,calc(100dvh-10rem))] overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.06] mt-2 pe-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{tr("No notifications")}</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read_at) markRead.mutate(n.id);
                      if (typeof n.payload?.card_id === "string") {
                        useUiStore.getState().openCardModal(n.payload.card_id);
                        setIsOpen(false);
                      }
                    }}
                    className={`py-2 px-1.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.05] rounded-xl transition-colors ${
                      !n.read_at
                        ? "font-medium text-slate-900 dark:text-slate-100"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <p className="break-words line-clamp-2">
                      {typeof n.payload?.message === "string"
                        ? n.payload.message
                        : n.type_}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {formatDateTime(n.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label={tr("Notifications (") + unreadCount + ")"}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted rounded-lg transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (isMobile ? <NativeBottomSheet open onClose={() => setIsOpen(false)} title={tr("Notifications (") + unreadCount + ")"}><div data-mobile-popup>{panel}</div></NativeBottomSheet> : panel)}

    </div>
  );
};
