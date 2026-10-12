import { useState } from "react";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import { useNotificationPreferences } from "@/hooks/notification/useDesktopNotifications";
export function DesktopNotificationSettings() {
  const user = useAuthStore((s) => s.user?.id) || "",
    enabled = useNotificationPreferences((s) => !!s.enabled[user]),
    setEnabled = useNotificationPreferences((s) => s.setEnabled),
    [message, setMessage] = useState("");
  return (
    <section className="p-5 border rounded-xl border-slate-200 dark:border-[#183035] space-y-3">
      <h2 className="font-semibold">Desktop notifications</h2>
      <p className="text-sm text-slate-500">
        Receive mentions, assignments, watched comments and reminders when this
        app is open in a background tab. Notifications use this browser’s
        permission.
      </p>
      <Button
        variant="outline"
        onClick={async () => {
          if (enabled) {
            setEnabled(user, false);
            return;
          }
          if (typeof Notification === "undefined") {
            setMessage("This browser does not support desktop notifications.");
            return;
          }
          const permission = await Notification.requestPermission();
          setEnabled(user, permission === "granted");
          setMessage(
            permission === "granted"
              ? "Notifications enabled."
              : "Allow notifications in your browser settings to enable this feature.",
          );
        }}
      >
        {enabled
          ? "Disable desktop notifications"
          : "Enable desktop notifications"}
      </Button>
      {message && (
        <p role="status" className="text-sm text-slate-500">
          {message}
        </p>
      )}
    </section>
  );
}
