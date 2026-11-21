import { tr, useUiLocale } from "@/i18n";
import "@/lib/brandStorage";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "@/lib/api/auth.api";
export function SsoCallback() {
  useUiLocale();
  const cache = useQueryClient();
  const navigate = useNavigate(),
    setAuth = useAuthStore((s) => s.setAuth);
  const [token] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token"),
  );
  const [error, setError] = useState(
    token ? "" : "SSO did not return a session.",
  );
  useEffect(() => {
    window.history.replaceState(null, "", "/sso/callback");
    if (!token) return;
    localStorage.setItem("mission_control_token", token);
    authApi
      .getMe()
      .then((user) => {
        cache.clear();
        setAuth(user, token);
        navigate("/", { replace: true });
      })
      .catch(() =>
        setError(tr("Could not establish your SSO session. Please sign in again.")),
      );
  }, [navigate, setAuth, token, cache]);
  return (
    <div className="p-10 text-center">
      {error ? tr(error) : tr("Completing secure sign-in…")}
    </div>
  );
}
