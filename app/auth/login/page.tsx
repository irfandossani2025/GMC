'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { ClinicLogo } from '@/components/branding/ClinicLogo';
import { postJson } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getNextPath = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const nextPath = searchParams.get('next');

    if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
      return nextPath;
    }

    return '/dashboard';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await postJson<{ success: boolean }>('/api/auth/login', { email, password });
      
      if (response.success) {
        router.push(getNextPath());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_25px_70px_rgba(24,91,115,0.12)] backdrop-blur">
          <ClinicLogo />
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Secure access for Grand Medical Center staff to manage members, barcodes, printable PVC cards, and clinic reports.
          </p>
        </div>

        {/* Login Form */}
        <Card className="surface-panel overflow-hidden rounded-[2rem] border-0 shadow-none">
          <CardContent className="pt-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
                Staff Login
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                Membership Operations Console
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="staff@gmc.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="mt-6 w-full rounded-2xl bg-primary hover:bg-primary/90"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
