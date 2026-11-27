import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { tr, useUiLocale } from "@/i18n";
import { SsoButton } from "./SsoButton";
import { apiError } from "@/lib/apiError";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLogin } from "@/hooks/auth/useLogin";
import {
  Input,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import { ShieldCheck } from "lucide-react";
import { NexaLogo } from "@/components/common/NexaLogo";

export const LoginPage = () => {
  useUiLocale();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [formErrors, setFormErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim())
      errors.identifier = "Username or email is required";
    if (!password) errors.password = "Password is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      await loginMutation.mutateAsync({
        username: identifier.trim(),
        email: identifier.trim(),
        password,
        otp: otp || undefined,
      });
      navigate("/");
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <div className="h-[100dvh] w-screen flex items-start sm:items-center justify-center p-4 bg-[var(--nexa-surface-l0)] relative overflow-y-auto overscroll-y-contain">
      {/* Decorative ambient gradient orbs */}
      <div className="absolute top-1/4 -start-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -end-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full shrink-0 max-w-md shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <NexaLogo size={48} />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground tracking-tight">
            NEXA{" "}
            <span className="text-primary">{tr("Mission Control")}</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">{tr("Sign in to direct your mission workspace")}</p>
        </CardHeader>

        <CardContent>
          <div className="flex justify-end mb-3"><LanguageSwitcher /></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMutation.isError && (
              <div className="p-3 bg-[var(--nexa-status-danger-surface)] rounded-xl text-xs text-[var(--nexa-status-danger-text)] font-medium">
                {apiError(loginMutation.error)}
              </div>
            )}

            <Input
              id="identifier"
              type="text"
              label={tr("Username or Email")}
              placeholder={tr("username or you@company.com")}
              value={identifier}
              error={formErrors.identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (formErrors.identifier)
                  setFormErrors((prev) => ({ ...prev, identifier: undefined }));
              }}
            />

            <Input
              id="password"
              type="password"
              label={tr("Password")}
              placeholder="••••••••"
              value={password}
              error={formErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formErrors.password)
                  setFormErrors((prev) => ({ ...prev, password: undefined }));
              }}
            />

            <Input
              label={tr("Authenticator or recovery code (if enabled)")}
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2"
              isLoading={loginMutation.isPending}
            >{tr("Sign In to Mission Control")}</Button>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>{tr("NEXA Argon2 secured authentication")}</span>
            </div>

            <div className="text-center pt-2 border-t border-[var(--nexa-divider)]">
              <span className="text-xs text-muted-foreground">{tr("Don't have an account?")}{" "}
              </span>
              <Link
                to="/register"
                className="text-xs font-semibold text-primary hover:underline"
              >{tr("Create one now")}</Link>
            </div>
          </form>
          <SsoButton />
        </CardContent>
      </Card>
    </div>
  );
};
