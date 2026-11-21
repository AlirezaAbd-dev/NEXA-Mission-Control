import { tr, useUiLocale } from "@/i18n";
import { Button } from "@/components/ui";
import { useSsoConfig } from "@/hooks/auth/useSsoConfig";
export function SsoButton() {
  useUiLocale();
  const { data } = useSsoConfig();
  return data?.enabled ? (
    <Button
      className="w-full mt-3"
      variant="outline"
      onClick={() => {
        window.location.href = "/api/v1/integrations/oidc/login";
      }}
    >{tr("Sign in with your organization")}</Button>
  ) : null;
}
