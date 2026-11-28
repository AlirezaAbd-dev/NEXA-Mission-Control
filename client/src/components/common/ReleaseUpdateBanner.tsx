import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { tr, useUiLocale } from "@/i18n";

const checkInterval = 90_000;
const minimumCheckGap = 10_000;
const buildIdPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

export function ReleaseUpdateBanner() {
  useUiLocale();
  const [available, setAvailable] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    const current = document.querySelector<HTMLMetaElement>('meta[name="mission-control-build"]')?.content;
    if (!current || !buildIdPattern.test(current)) return;

    let lastCheck = -Infinity;
    let request: AbortController | undefined;

    async function check() {
      const now = Date.now();
      if (document.hidden || !navigator.onLine || request || now - lastCheck < minimumCheckGap) return;

      lastCheck = now;
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), minimumCheckGap);
      try {
        const marker = new URL(`${import.meta.env.BASE_URL}version.json`, window.location.origin);
        marker.searchParams.set("_", String(now));
        const response = await fetch(marker, { cache: "no-store", signal: controller.signal });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return;

        const data: unknown = await response.json();
        const version = data && typeof data === "object" && "version" in data ? data.version : null;
        if (!controller.signal.aborted && typeof version === "string" && buildIdPattern.test(version)) {
          setAvailable(version === current ? null : version);
        }
      } catch {
        // Network and parsing failures are retried on the next normal check.
      } finally {
        window.clearTimeout(timeout);
        request = undefined;
      }
    }

    void check();
    const interval = window.setInterval(check, checkInterval);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      request?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, []);

  function reload() {
    if (!available) return;
    const next = new URL(window.location.href);
    next.searchParams.set("_release", available);
    window.location.replace(next);
  }

  return (
    <div className="shrink-0">
      <span className="sr-only" role="status">
        {available && available !== dismissed ? tr("A new version of Mission Control is available.") : ""}
      </span>
      {available && available !== dismissed && (
        <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl border border-primary/25 bg-[var(--nexa-surface-l1)] p-2 text-foreground sm:mx-5 sm:gap-3 sm:px-3">
          <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary sm:grid">
            <Sparkles size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-relaxed">{tr("Update available")}</p>
            <p className="text-xs leading-relaxed text-foreground/75">{tr("Reload when you’re ready to get the latest version.")}</p>
          </div>
          <Button type="button" size="sm" className="min-h-11 shrink-0 whitespace-nowrap px-2.5 sm:px-3" onClick={reload}>
            <RefreshCw size={14} aria-hidden="true" className="hidden sm:block" />
            {tr("Reload")}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-11 shrink-0" aria-label={tr("Dismiss update notice")} onClick={() => setDismissed(available)}>
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
