import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { tr, useUiLocale } from "@/i18n";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useRegister } from "@/hooks/auth/useRegister";
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

export const RegisterPage = () => {
  useUiLocale();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
  }>({});

  const registerMutation = useRegister();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; username?: string; password?: string } = {};
    if (!displayName.trim() && !username.trim())
      errors.username = "Username is required";
    if (!username.trim()) errors.username = "Username is required";
    if (!email.trim()) errors.email = "Email address is required";
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      await registerMutation.mutateAsync({
        email: email.trim(),
        username: username.trim(),
        display_name: displayName.trim() || username.trim(),
        password,
      });
      navigate("/");
    } catch {
      // Error is handled in mutation
    }
  };

  return (
    <div className="h-[100dvh] w-screen flex items-start sm:items-center justify-center p-4 bg-[var(--nexa-surface-l0)] relative overflow-y-auto overscroll-y-contain">
      {/* Decorative ambient gradient orbs */}
      <div className="absolute top-1/4 -end-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -start-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full shrink-0 max-w-md shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <NexaLogo size={48} />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground tracking-tight">
            NEXA{" "}
            <span className="text-primary">{tr("Mission Control")}</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">{tr("Join your mission workspace and start building")}</p>
        </CardHeader>

        <CardContent>
          <div className="flex justify-end mb-3"><LanguageSwitcher /></div>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {registerMutation.isError && (
              <div className="p-3 bg-[var(--nexa-status-danger-surface)] rounded-xl text-xs text-[var(--nexa-status-danger-text)] font-medium">
                {(registerMutation.error as any)?.response?.data?.error
                  ?.message || tr("Registration failed")}
              </div>
            )}

            <Input
              id="displayName"
              label={tr("Full Name")}
              placeholder={tr("Alex Walker")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <Input
              id="username"
              label={tr("Username")}
              placeholder="alexw"
              value={username}
              error={formErrors.username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (formErrors.username)
                  setFormErrors((prev) => ({ ...prev, username: undefined }));
              }}
            />

            <Input
              id="email"
              type="email"
              label={tr("Email Address")}
              placeholder={tr("alex@company.com")}
              value={email}
              error={formErrors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formErrors.email)
                  setFormErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />

            <Input
              id="password"
              type="password"
              label={tr("Password")}
              placeholder={tr("At least 6 characters")}
              value={password}
              error={formErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formErrors.password)
                  setFormErrors((prev) => ({ ...prev, password: undefined }));
              }}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2"
              isLoading={registerMutation.isPending}
            >{tr("Get Started Free")}</Button>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>{tr("Instant provisioning & workspace auto-setup")}</span>
            </div>

            <div className="text-center pt-2 border-t border-[var(--nexa-divider)]">
              <span className="text-xs text-muted-foreground">{tr("Already have an account?")}{" "}
              </span>
              <Link
                to="/login"
                className="text-xs font-semibold text-primary hover:underline"
              >{tr("Sign in")}</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
