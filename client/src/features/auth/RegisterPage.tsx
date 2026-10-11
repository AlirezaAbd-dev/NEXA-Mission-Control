import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useRegister } from '@/hooks/auth/useRegister';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { CheckCircle2 } from 'lucide-react';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const registerMutation = useRegister();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username || !displayName) return;

    try {
      await registerMutation.mutateAsync({
        email,
        username,
        display_name: displayName,
        password,
      });
      navigate('/');
    } catch {
      // Error in mutation state
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-200 dark:shadow-none">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold">Create your Account</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Get started with your free TaskFlow workspace
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {registerMutation.isError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium">
                {(registerMutation.error as any)?.response?.data?.error?.message || 'Registration failed'}
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
              id="username"
              label="Username"
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              required
            />

            <Input
              id="displayName"
              label="Full Name / Display Name"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />

            <Input
              id="password"
              type="password"
              label="Password (min 6 characters)"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2"
              isLoading={registerMutation.isPending}
            >
              Create Account
            </Button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Already have an account? </span>
              <Link to="/login" className="text-xs font-semibold text-indigo-600 hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
