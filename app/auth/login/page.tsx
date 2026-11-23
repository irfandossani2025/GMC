'use client';

import { LanguageSwitcher, useLanguage } from '@/components/i18n/LanguageProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { ClinicLogo } from '@/components/branding/ClinicLogo';
import { postJson } from '@/lib/api-client';

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [setupUserId, setSetupUserId] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');
  const [isSettingUpUsername, setIsSettingUpUsername] = useState(false);
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
      const response = await postJson<{ success: boolean }>('/api/auth/login', { username, password });
      
      if (response.success) {
        router.push(getNextPath());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setSetupSuccess('');
    setIsSettingUpUsername(true);
    try {
      await postJson('/api/auth/login', { action: 'setup-username', userId: setupUserId, password: setupPassword, username: newUsername });
      setUsername(newUsername.trim().toLowerCase());
      setSetupPassword('');
      setNewUsername('');
      setSetupSuccess('Username set. Please sign in with it now.');
      setSetupMode(false);
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Unable to set username. Please try again.');
    } finally {
      setIsSettingUpUsername(false);
    }
  };

  return (
    <div className="auth-page"><LanguageSwitcher className="auth-language-switch" />
      <div className="auth-layout">
        {/* Header */}
        <div className="auth-brand-panel">
          <ClinicLogo /><div className="auth-intro"><span>{t("CLINIC OPERATIONS")}</span><h1>{t("Better care starts with")}<br />{t("a connected practice.")}</h1></div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            {t("Secure access for Grand Medical Center staff to manage members, barcodes, printable PVC cards, and clinic reports.")} </p>
        </div>

        {/* Login Form */}
        <Card className="auth-form-panel">
          <CardContent className="pt-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
                {t("Staff Login")} </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                {t("Welcome back")} </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {t(error)}
                </div>
              )}

              <Input
                label={t("Username")}
                autoComplete="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <Input
                label={t("Password")}
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
            {setupSuccess && <p className="mt-4 text-sm text-green-700">{t(setupSuccess)}</p>}
            <button type="button" className="mt-4 text-sm font-medium text-primary underline" onClick={() => { setSetupMode(!setupMode); setSetupError(''); setSetupSuccess(''); }}>
              {setupMode ? t("Back to sign in") : t("First time? Set up your username")}
            </button>
            {setupMode && (
              <form onSubmit={handleUsernameSetup} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
                <p className="text-sm text-slate-600">{t("Use your existing User ID and password to choose a username.")}</p>
                {setupError && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{t(setupError)}</div>}
                <Input label={t("User ID")} autoComplete="username" type="text" placeholder="Enter your existing User ID" value={setupUserId} onChange={(e) => setSetupUserId(e.target.value)} required />
                <Input label={t("Current password")} autoComplete="current-password" type="password" value={setupPassword} onChange={(e) => setSetupPassword(e.target.value)} required />
                <Input label={t("Choose username")} autoComplete="new-password" type="text" placeholder="3–32 letters, numbers, dots, hyphens or underscores" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} minLength={3} maxLength={32} required />
                <Button type="submit" variant="primary" size="lg" className="w-full rounded-2xl bg-primary hover:bg-primary/90" isLoading={isSettingUpUsername}>{t("Set Username")}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
