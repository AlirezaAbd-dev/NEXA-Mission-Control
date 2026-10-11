import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogin } from '@/hooks/auth/useLogin';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Sparkles, ShieldCheck } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Email address is required';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      await loginMutation.mutateAsync({ email: email.trim(), password });
      navigate('/');
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070e10] relative overflow-hidden">
      {/* Decorative ambient gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-slate-200/80 dark:border-[#183035] bg-white/95 dark:bg-[#0d1a1d] backdrop-blur-md relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/25 ring-4 ring-teal-500/10">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-teal-200 bg-clip-text text-transparent">
            NEXA Mission Control
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Sign in to direct your mission workspace
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMutation.isError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                {(loginMutation.error as any)?.response?.data?.error?.message || 'Invalid email or password'}
              </div>
            )}

            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="you@company.com"
              value={email}
              error={formErrors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
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
                if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
              }}
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
              <span className="text-xs text-slate-500">Don't have an account? </span>
              <Link to="/register" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                Create one now
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
