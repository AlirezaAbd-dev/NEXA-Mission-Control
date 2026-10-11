import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useRegister } from '@/hooks/auth/useRegister';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Rocket, ShieldCheck } from 'lucide-react';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const registerMutation = useRegister();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password) return;

    try {
      await registerMutation.mutateAsync({
        email,
        username,
        display_name: displayName || username,
        password,
      });
      navigate('/');
    } catch {
      // Error is handled in mutation
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#090d16] relative overflow-hidden">
      {/* Decorative ambient gradient orbs */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-500/10">
            <Rocket className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Create an Account
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Join your workspace and start building high velocity products
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {registerMutation.isError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                {(registerMutation.error as any)?.response?.data?.error?.message || 'Registration failed'}
              </div>
            )}

            <Input
              id="displayName"
              label="Full Name"
              placeholder="Alex Walker"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <Input
              id="username"
              label="Username"
              placeholder="alexw"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="At least 6 characters"
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
              Get Started Free
            </Button>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Instant provisioning & workspace auto-setup</span>
            </div>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">Already have an account? </span>
              <Link to="/login" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
