'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getJson, postJson } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
export default function SuperAdminSetupPage() {
  const { t } = useLanguage();
  const [setup, setSetup] = useState<{ enabled: boolean; email?: string } | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; getJson<{ enabled: boolean; email?: string }>('/api/users/super-admin-setup').then(data => { if (active) setSetup(data); }).catch((e: Error) => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await postJson('/api/users/super-admin-setup', { name: form.get('name'), password: form.get('password'), confirmPassword: form.get('confirmPassword'), confirmAccess: form.get('confirmAccess') === 'on' });
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Setup failed'); } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-lg space-y-6"><Card><CardHeader><CardTitle>{t("Super Admin setup")}</CardTitle></CardHeader><CardContent>
    <p className="mb-5 text-sm text-slate-600">{t("Create the separate owner account with full clinic access and control over administrators. This setup closes after the first Super Admin is created.")}</p>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{t(error)}</p>}
    {done ? <div role="status"><p className="mb-4 text-green-700">{t("Super Admin account created successfully.")}</p><Link href="/auth/super-admin" className="text-primary underline">{t("Open Super Admin sign-in")}</Link></div> : setup?.enabled ? <form onSubmit={submit} className="space-y-4">
      <Input label={t("Full name")} aria-label={t("Full name")} name="name" minLength={2} required autoComplete="name" />
      <Input label={t("Super Admin email")} aria-label={t("Super Admin email")} value={setup.email || ''} readOnly type="email" />
      <Input label={t("Password")} aria-label={t("Password")} name="password" type="password" minLength={12} autoComplete="new-password" required />
      <Input label={t("Confirm password")} aria-label={t("Confirm password")} name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required />
      <p className="text-sm text-slate-500">{t("Use at least 12 characters.")}</p>
      <label className="flex gap-3 text-sm"><input type="checkbox" name="confirmAccess" required /><span>{t("I approve granting this account full Super Admin access to clinic records and administrator management.")}</span></label>
      <Button type="submit" disabled={busy}>{busy ? t("Creating account…") : t("Create Super Admin account")}</Button>
    </form> : !error && <p className="text-slate-600">{setup ? t("Super Admin setup is already complete.") : t("Checking setup availability…")}</p>}
  </CardContent></Card></div>;
}
