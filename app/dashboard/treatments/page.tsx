'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { deleteJson, getJson, patchJson, postJson } from '@/lib/api-client';

interface TreatmentPackageItem {
  id: string;
  name: string;
  description?: string;
  sessionCount: number;
  price: number;
  validityMonths: number;
  treatment: {
    id: string;
    name: string;
    category: string;
  };
}

interface TreatmentItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  durationMinutes: number;
  price: number;
  packages: TreatmentPackageItem[];
}

const emptyForm = {
  treatmentName: '',
  category: '',
  packageName: '',
  description: '',
  durationMinutes: 30,
  treatmentPrice: 0,
  sessionCount: 1,
  packagePrice: 0,
  validityMonths: 6,
};

export default function TreatmentsPage() {
  const { t } = useLanguage();
  const [treatments, setTreatments] = useState<TreatmentItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [loading,setLoading]=useState(true);
  // Super Admin catalog management
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editTreatment, setEditTreatment] = useState<{ id: string; name: string; category: string; durationMinutes: number; price: number } | null>(null);
  const [editPackage, setEditPackage] = useState<{ id: string; name: string; description: string; sessionCount: number; price: number; validityMonths: number } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{ type: 'treatment' | 'package'; id: string; name: string } | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    fetchTreatments();
    getJson<{ role?: string }>('/api/auth/me').then((me) => setIsSuperAdmin(me.role === 'SUPER_ADMIN')).catch(() => setIsSuperAdmin(false));
  }, []);

  const runCatalogAction = async (action: () => Promise<unknown>, success: string) => {
    setIsWorking(true);
    setMessage(null);
    try {
      await action();
      setMessage({ type: 'success', text: success });
      setEditTreatment(null);
      setEditPackage(null);
      setPendingRemoval(null);
      await fetchTreatments();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'The change could not be saved.' });
    } finally {
      setIsWorking(false);
    }
  };

  const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const removalPanel = (type: 'treatment' | 'package', id: string) =>
    pendingRemoval && pendingRemoval.type === type && pendingRemoval.id === id ? (
      <section className="session-confirmation mt-3" aria-label={t(type === 'treatment' ? 'Remove treatment' : 'Remove package')}>
        <h3>{t(type === 'treatment' ? 'Remove this treatment and all its packages?' : 'Remove this package from sale?')}</h3>
        <p><bdi>{pendingRemoval.name}</bdi></p>
        <p>{t('It will no longer be offered to patients. Patients who already bought it keep their remaining sessions.')}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            isLoading={isWorking}
            onClick={() => runCatalogAction(
              () => deleteJson(type === 'treatment' ? `/api/catalog/treatments/${id}` : `/api/catalog/packages/${id}`),
              type === 'treatment' ? 'Treatment removed.' : 'Package removed.'
            )}
          >
            {t(type === 'treatment' ? 'Remove treatment' : 'Remove package')}
          </Button>
          <Button variant="outline" disabled={isWorking} onClick={() => setPendingRemoval(null)}>{t('Cancel')}</Button>
        </div>
      </section>
    ) : null;

  const fetchTreatments = async () => {
    setLoading(true);
    try {
      const data = await getJson<TreatmentItem[]>('/api/treatments');
      setTreatments(data);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load treatments' });
    } finally {setLoading(false);}
  };

  const updateField = (field: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      await postJson('/api/treatments', form);
      setMessage({ type: 'success', text: 'Treatment package saved successfully.' });
      setForm(emptyForm);
      await fetchTreatments();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save treatment package' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">{message && <div className={`feedback-banner ${message.type === "success" ? "success" : "error"}`} role={message.type === "success" ? "status" : "alert"}>{t(message.text)}</div>}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">{t("Clinic services")}</p>
        <h1 className="page-title mt-2">{t("Treatment packages")}</h1>
        <p className="page-subtitle mt-3">
          {t("Manage the treatment and package catalog used for membership sales, session balances, and booking workflows.")} </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Available packages")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="empty-state" role="status">{t("Loading packages...")}</div> : treatments.length === 0 ? (
            <p className="text-sm text-slate-500">{t("No treatment packages configured yet.")}</p>
          ) : (
            <div className="space-y-6">
              {treatments.map((treatment) => (
                <div key={treatment.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{treatment.name}</p>
                      <p className="text-sm text-slate-500">{treatment.category}</p>
                    </div>
                    <p className="text-sm text-slate-600">{t("Duration:")} {treatment.durationMinutes} {t("mins")}</p>
                  </div>
                  {isSuperAdmin && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button size="sm" variant="outline" onClick={() => { setPendingRemoval(null); setEditPackage(null); setEditTreatment({ id: treatment.id, name: treatment.name, category: treatment.category, durationMinutes: treatment.durationMinutes, price: treatment.price }); }}>{t("Edit treatment")}</Button>
                      <Button size="sm" variant="outline" className="border-red-300 text-red-700" onClick={() => { setEditTreatment(null); setPendingRemoval({ type: 'treatment', id: treatment.id, name: treatment.name }); }}>{t("Remove treatment")}</Button>
                    </div>
                  )}
                  {removalPanel('treatment', treatment.id)}
                  {editTreatment?.id === treatment.id && (
                    <form
                      className="mt-3 grid gap-3 rounded-lg border border-amber-200 p-3 sm:grid-cols-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const { id, ...data } = editTreatment;
                        runCatalogAction(() => patchJson(`/api/catalog/treatments/${id}`, data), 'Treatment updated.');
                      }}
                    >
                      <label className="block text-sm font-medium text-gray-700">{t("Treatment name")}<input required className={inputClass} value={editTreatment.name} onChange={(e) => setEditTreatment({ ...editTreatment, name: e.target.value })} /></label>
                      <label className="block text-sm font-medium text-gray-700">{t("Category")}<input required className={inputClass} value={editTreatment.category} onChange={(e) => setEditTreatment({ ...editTreatment, category: e.target.value })} /></label>
                      <label className="block text-sm font-medium text-gray-700">{t("Duration (minutes)")}<input type="number" min={1} dir="ltr" className={inputClass} value={editTreatment.durationMinutes} onChange={(e) => setEditTreatment({ ...editTreatment, durationMinutes: Number(e.target.value) })} /></label>
                      <label className="block text-sm font-medium text-gray-700">{t("Treatment price")}<input type="number" min={0} step="0.01" dir="ltr" className={inputClass} value={editTreatment.price} onChange={(e) => setEditTreatment({ ...editTreatment, price: Number(e.target.value) })} /></label>
                      <div className="flex gap-3 sm:col-span-2"><Button type="submit" size="sm" isLoading={isWorking}>{t("Save changes")}</Button><Button type="button" size="sm" variant="outline" disabled={isWorking} onClick={() => setEditTreatment(null)}>{t("Cancel")}</Button></div>
                    </form>
                  )}

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {treatment.packages.map((pkg) => (
                      <div key={pkg.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">{pkg.name}</p>
                        <p className="text-sm text-slate-600">{pkg.description || t("No package description")}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-700">
                          <span className="rounded-full bg-white px-3 py-1 border border-slate-200">{pkg.sessionCount} {t("sessions")}</span>
                          <span className="rounded-full bg-white px-3 py-1 border border-slate-200">{pkg.validityMonths} {t("months")}</span>
                          <span className="rounded-full bg-white px-3 py-1 border border-slate-200">{pkg.price.toFixed(2)} {t("OMR")}</span>
                        </div>
                        {isSuperAdmin && editPackage?.id !== pkg.id && (
                          <div className="mt-3 flex flex-wrap gap-3">
                            <Button size="sm" variant="outline" onClick={() => { setPendingRemoval(null); setEditTreatment(null); setEditPackage({ id: pkg.id, name: pkg.name, description: pkg.description || '', sessionCount: pkg.sessionCount, price: pkg.price, validityMonths: pkg.validityMonths }); }}>{t("Edit package")}</Button>
                            <Button size="sm" variant="outline" className="border-red-300 text-red-700" onClick={() => { setEditPackage(null); setPendingRemoval({ type: 'package', id: pkg.id, name: pkg.name }); }}>{t("Remove package")}</Button>
                          </div>
                        )}
                        {removalPanel('package', pkg.id)}
                        {editPackage?.id === pkg.id && (
                          <form
                            className="mt-3 grid gap-3"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const { id, ...data } = editPackage;
                              runCatalogAction(() => patchJson(`/api/catalog/packages/${id}`, data), 'Package updated. Changes apply to new sales only.');
                            }}
                          >
                            <label className="block text-sm font-medium text-gray-700">{t("Package name")}<input required className={inputClass} value={editPackage.name} onChange={(e) => setEditPackage({ ...editPackage, name: e.target.value })} /></label>
                            <label className="block text-sm font-medium text-gray-700">{t("Package description")}<input className={inputClass} value={editPackage.description} onChange={(e) => setEditPackage({ ...editPackage, description: e.target.value })} /></label>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <label className="block text-sm font-medium text-gray-700">{t("Session count")}<input type="number" min={1} dir="ltr" className={inputClass} value={editPackage.sessionCount} onChange={(e) => setEditPackage({ ...editPackage, sessionCount: Number(e.target.value) })} /></label>
                              <label className="block text-sm font-medium text-gray-700">{t("Package price")}<input type="number" min={0} step="0.01" dir="ltr" className={inputClass} value={editPackage.price} onChange={(e) => setEditPackage({ ...editPackage, price: Number(e.target.value) })} /></label>
                              <label className="block text-sm font-medium text-gray-700">{t("Validity (months)")}<input type="number" min={1} dir="ltr" className={inputClass} value={editPackage.validityMonths} onChange={(e) => setEditPackage({ ...editPackage, validityMonths: Number(e.target.value) })} /></label>
                            </div>
                            <p className="text-xs text-slate-500">{t("Changes apply to new sales only. Patients who already bought this package are not affected.")}</p>
                            <div className="flex gap-3"><Button type="submit" size="sm" isLoading={isWorking}>{t("Save changes")}</Button><Button type="button" size="sm" variant="outline" disabled={isWorking} onClick={() => setEditPackage(null)}>{t("Cancel")}</Button></div>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Add a new package")}</CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {t(message.text)}
            </div>
          )}

          <form onSubmit={handleSubmit}><fieldset disabled={isSaving} className="grid gap-5 lg:grid-cols-2">
            <div>
              <label htmlFor="field-app-dashboard-treatments-page-tsx-1" className="mb-1 block text-sm font-medium text-gray-700">{t("Treatment name")}</label>
              <input id="field-app-dashboard-treatments-page-tsx-1"
                type="text"
                value={form.treatmentName}
                onChange={(event) => updateField('treatmentName', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="field-app-dashboard-treatments-page-tsx-2" className="mb-1 block text-sm font-medium text-gray-700">{t("Category")}</label>
              <input id="field-app-dashboard-treatments-page-tsx-2"
                type="text"
                value={form.category}
                onChange={(event) => updateField('category', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="field-app-dashboard-treatments-page-tsx-3" className="mb-1 block text-sm font-medium text-gray-700">{t("Package name")}</label>
              <input id="field-app-dashboard-treatments-page-tsx-3"
                type="text"
                value={form.packageName}
                onChange={(event) => updateField('packageName', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="field-app-dashboard-treatments-page-tsx-4" className="mb-1 block text-sm font-medium text-gray-700">{t("Package description")}</label>
              <textarea id="field-app-dashboard-treatments-page-tsx-4"
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <div>
              <label htmlFor="field-app-dashboard-treatments-page-tsx-5" className="mb-1 block text-sm font-medium text-gray-700">{t("Session count")}</label>
              <input id="field-app-dashboard-treatments-page-tsx-5"
                type="number"
                value={form.sessionCount}
                min={1}
                onChange={(event) => updateField('sessionCount', Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="field-app-dashboard-treatments-page-tsx-6" className="mb-1 block text-sm font-medium text-gray-700">{t("Package price")}</label>
              <input id="field-app-dashboard-treatments-page-tsx-6"
                type="number"
                step="0.01"
                value={form.packagePrice}
                onChange={(event) => updateField('packagePrice', Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="field-app-dashboard-treatments-page-tsx-7" className="mb-1 block text-sm font-medium text-gray-700">{t("Validity (months)")}</label>
              <input id="field-app-dashboard-treatments-page-tsx-7"
                type="number"
                min={1}
                value={form.validityMonths}
                onChange={(event) => updateField('validityMonths', Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="field-app-dashboard-treatments-page-tsx-8" className="mb-1 block text-sm font-medium text-gray-700">{t("Treatment price")}</label>
              <input id="field-app-dashboard-treatments-page-tsx-8"
                type="number"
                step="0.01"
                value={form.treatmentPrice}
                onChange={(event) => updateField('treatmentPrice', Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSaving}>
                {t("Save treatment package")} </Button>
            </div>
          </fieldset></form>
        </CardContent>
      </Card>
    </div>
  );
}
