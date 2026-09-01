'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClinicLogo } from '@/components/branding/ClinicLogo';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { postJson } from '@/lib/api-client';

export default function SetupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      setIsSubmitting(true);
      await postJson('/api/setup/admin', formData);
      setSuccess('Initial admin created successfully. Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 1200);
    } catch (submissionError) {
      console.error('Failed to create initial admin user:', submissionError);
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to create initial admin user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_25px_70px_rgba(24,91,115,0.12)] backdrop-blur">
          <ClinicLogo />
          <p className="mt-5 text-sm leading-6 text-slate-600">
            One-time setup for the first Grand Medical Center administrator. This page will stop working automatically after the first admin user is created.
          </p>
        </div>

        <Card className="surface-panel overflow-hidden rounded-[2rem] border-0 shadow-none">
          <CardContent className="pt-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
                Initial Setup
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                Create the first admin account
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <Input
                label="Admin Name"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Administrator name"
                required
              />

              <Input
                label="Admin Email"
                type="email"
                value={formData.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="admin@gmc.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="At least 8 characters"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="mt-6 w-full rounded-2xl bg-primary hover:bg-primary/90"
                isLoading={isSubmitting}
              >
                Create Admin
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
