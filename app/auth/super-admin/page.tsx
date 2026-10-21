'use client';

import { LanguageSwitcher, useLanguage } from '@/components/i18n/LanguageProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { ClinicLogo } from '@/components/branding/ClinicLogo';
import { postJson } from '@/lib/api-client';

export default function SuperAdminLoginPage() {
  const { t } = useLanguage();
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
      const response = await postJson<{ success: boolean }>('/api/auth/login', { email, password, superAdmin: true });
      
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
    <div className="auth-page"><LanguageSwitcher className="auth-language-switch" />
      <div className="auth-layout">
        {/* Header */}
        <div className="auth-brand-panel">
          <ClinicLogo /><div className="auth-intro"><span>{t("CLINIC OPERATIONS")}</span><h1>{t("Better care starts with")}<br />{t("a connected practice.")}</h1></div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            {t("Restricted owner access to clinic operations and administrator management.")} </p>
        </div>

        {/* Login Form */}
        <Card className="auth-form-panel">
          <CardContent className="pt-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
                {t("Super Admin Login")} </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                {t("Super administrator access")} </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {t(error)}
                </div>
              )}

              <Input
                label={t("Email Address")}
                aria-label={t("Email Address")}
                autoComplete="username"
                type="email"
                placeholder="superadmin@grandmedicalcare.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label={t("Password")}
                aria-label={t("Password")}
                autoComplete="current-password"
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
                {t("Sign In")} </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
