import { Languages } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setLocale, useUiLocale } from "@/i18n";

export function LanguageSwitcher() {
  const locale = useUiLocale();
  return <Button variant="ghost" size="sm" className="nexa-tonal-action gap-1.5 shrink-0 px-2.5" onClick={() => setLocale(locale === "en" ? "fa" : "en")} aria-label={locale === "en" ? "تغییر زبان به فارسی" : "Switch language to English"} title={locale === "en" ? "فارسی" : "English"}>
    <Languages size={16} /><span className="hidden min-[400px]:inline" lang={locale === "en" ? "fa" : "en"}>{locale === "en" ? "فا" : "EN"}</span>
  </Button>;
}
