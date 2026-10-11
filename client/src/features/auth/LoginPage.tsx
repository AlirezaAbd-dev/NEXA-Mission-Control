import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogin } from '@/hooks/auth/useLogin';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await loginMutation.mutateAsync({ email, password });
      navigate('/');
    } catch {
      // Error is stored in mutation state
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-200 dark:shadow-none">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold">Welcome to TaskFlow</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sign in to access your projects and boards
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMutation.isError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium">
                {(loginMutation.error as any)?.response?.data?.error?.message || 'Invalid email or password'}
              </div>
            )}

            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2"
              isLoading={loginMutation.isPending}
            >
              Sign In
            </Button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Don't have an account? </span>
              <Link to="/register" className="text-xs font-semibold text-indigo-600 hover:underline">
                Create one
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
