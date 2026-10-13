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
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070e10] relative overflow-hidden">
      {/* Decorative ambient gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-slate-200/80 dark:border-[#183035] bg-white/95 dark:bg-[#0d1a1d] backdrop-blur-md relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <NexaLogo size={48} />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:white tracking-tight">
            NEXA{" "}
            <span className="text-teal-600 dark:text-teal-400">
              Mission Control
            </span>
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1.5 font-medium">
            Sign in to direct your mission workspace
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMutation.isError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                {apiError(loginMutation.error)}
              </div>
            )}

            <Input
              id="identifier"
              type="text"
              label="Username or Email"
              placeholder="username or you@company.com"
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
              label="Password"
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
              label="Authenticator or recovery code (if enabled)"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2"
              isLoading={loginMutation.isPending}
            >
              Sign In to Mission Control
            </Button>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              <span>NEXA Argon2 secured authentication</span>
            </div>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-[#183035]">
              <span className="text-xs text-slate-500">
                Don't have an account?{" "}
              </span>
              <Link
                to="/register"
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Create one now
              </Link>
            </div>
          </form>
          <SsoButton />
        </CardContent>
      </Card>
    </div>
  );
};
