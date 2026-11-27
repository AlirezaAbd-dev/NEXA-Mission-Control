import React, { useState } from "react";
import { Check, Palette, Undo2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  THEME_PALETTES,
  useUiStore,
  type ThemePaletteId,
} from "@/stores/ui.store";
import { tr, useUiLocale } from "@/i18n";
import { cn } from "@/lib/utils";

const PALETTE_LABELS: Record<ThemePaletteId, string> = {
  teal: "Emerald (Default)",
  neutral: "Neutral",
  amber: "Amber",
  blue: "Blue",
  indigo: "Indigo",
  violet: "Violet",
  rose: "Rose",
  pink: "Pink",
  brown: "Terracotta",
};

export function ThemePicker() {
  useUiLocale();
  const uiTheme = useUiStore((s) => s.uiTheme);
  const setUiTheme = useUiStore((s) => s.setUiTheme);
  const setPreviewUiTheme = useUiStore((s) => s.setPreviewUiTheme);

  const [selected, setSelected] = useState<ThemePaletteId>(uiTheme);

  React.useEffect(() => {
    setSelected(uiTheme);
  }, [uiTheme]);

  const hasChanges = selected !== uiTheme;

  const handleSelect = (id: ThemePaletteId) => {
    setSelected(id);
    setPreviewUiTheme(id === uiTheme ? null : id);
  };

  const handleReset = () => {
    setSelected(uiTheme);
    setPreviewUiTheme(null);
  };

  const handleSave = () => {
    setUiTheme(selected);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{tr("Dashboard Color Palette")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {tr("Choose your preferred NEXA color theme with live preview.")}
              </p>
            </div>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2 ms-auto">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <Undo2 className="h-3.5 w-3.5" />
                <span>{tr("Cancel")}</span>
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                <Check className="h-3.5 w-3.5" />
                <span>{tr("Save")}</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div
          role="radiogroup"
          aria-label={tr("Dashboard Color Palette")}
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5"
        >
          {THEME_PALETTES.map((palette) => {
            const isSelected = selected === palette;
            return (
              <button
                key={palette}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(palette)}
                className={cn(
                  "nexa-theme-card flex flex-col gap-1.5 rounded-2xl p-3 text-start transition-colors cursor-pointer",
                  isSelected
                    ? "bg-[var(--nexa-surface-l2)] ring-1 ring-inset ring-primary/60"
                    : "bg-[var(--nexa-surface-l2)]/50 hover:bg-[var(--nexa-surface-l2)]",
                )}
              >
                <span
                  data-nexa-palette-preview={palette}
                  aria-hidden="true"
                  className="mb-1.5 grid h-14 w-full grid-cols-[26%_1fr] gap-1.5 rounded-lg [color-scheme:dark] bg-[var(--nexa-surface-l0)] p-1.5"
                >
                  <span className="flex flex-col justify-center gap-1 rounded-sm bg-[var(--nexa-surface-l1)] px-1">
                    <span className="h-1.5 rounded-full bg-white/15" />
                    <span className="h-1.5 rounded-full bg-[color-mix(in_srgb,var(--nexa-action-primary-bg)_65%,var(--nexa-surface-l1))]" />
                    <span className="h-1.5 rounded-full bg-white/15" />
                  </span>
                  <span className="flex flex-wrap content-center items-center gap-1.5 rounded-sm bg-[var(--nexa-surface-l1)] p-1.5">
                    <span className="grid h-4 w-8 max-w-full place-items-center rounded-sm bg-[var(--nexa-action-primary-bg)] text-[var(--nexa-action-primary-fg)]">
                      <Check className="size-2.5" />
                    </span>
                    <span className="h-2.5 w-4 rounded-full bg-[color-mix(in_srgb,var(--nexa-action-primary-bg)_24%,var(--nexa-surface-l2))]" />
                  </span>
                </span>
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {tr(PALETTE_LABELS[palette])}
                  </span>
                  {uiTheme === palette && (
                    <Badge variant="primary" className="text-[10px] px-1.5 py-0">
                      {tr("Active")}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
