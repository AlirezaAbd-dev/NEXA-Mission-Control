import { Button } from "@/components/ui";
import { useSsoConfig } from "@/hooks/auth/useSsoConfig";
export function SsoButton() {
  const { data } = useSsoConfig();
  return data?.enabled ? (
    <Button
      className="w-full mt-3"
      variant="outline"
      onClick={() => {
        window.location.href = "/api/v1/integrations/oidc/login";
      }}
    >
      Sign in with your organization
    </Button>
  ) : null;
}
