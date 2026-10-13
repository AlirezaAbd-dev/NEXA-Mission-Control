import { useUiStore } from "@/stores/ui.store";
import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/notification/useNotifications";
import { useMarkAllNotificationsRead } from "@/hooks/notification/useMarkAllNotificationsRead";
import { useMarkNotificationRead } from "@/hooks/notification/useMarkNotificationRead";
import { formatDateTime } from "@/lib/utils";

export const NotificationBell = () => {
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
        !containerRef.current.contains(e.target as Node)
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted rounded-lg transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-2xl p-4 z-50">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Notifications ({unreadCount})
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-border mt-2">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No notifications
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read_at) markRead.mutate(n.id);
                    if (typeof n.payload.card_id === "string")
                      useUiStore.getState().openCardModal(n.payload.card_id);
                  }}
                  className={`py-2 px-1 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-muted/50 rounded transition-colors ${
                    !n.read_at
                      ? "font-medium text-slate-900 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <p>
                    {typeof n.payload?.message === "string"
                      ? n.payload.message
                      : n.type_}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
