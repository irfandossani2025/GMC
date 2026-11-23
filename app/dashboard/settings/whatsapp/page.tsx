'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getJson, postJson } from '@/lib/api-client';
import { TEMPLATE_GUIDE } from '@/lib/whatsapp-cloud/templates';

interface Settings {
  enabled: boolean; phoneNumberId: string; businessAccountId: string; apiVersion: string;
  sendCardOnIssue: boolean; sendSessionConfirmation: boolean;
  cardTemplateName: string; cardTemplateLanguage: string; sessionTemplateName: string; sessionTemplateLanguage: string;
  hasAccessToken: boolean; enabledAt: string | null; lastVerifiedAt: string | null; verifiedNumber: string | null; verifiedName: string | null; lastTestSentAt: string | null;
  revision: string | null;
}
const initial: Settings = {
  enabled: false, phoneNumberId: '', businessAccountId: '', apiVersion: 'v21.0', sendCardOnIssue: true, sendSessionConfirmation: true,
  cardTemplateName: 'gmc_membership_card', cardTemplateLanguage: 'en', sessionTemplateName: 'gmc_session_recorded', sessionTemplateLanguage: 'en',
  hasAccessToken: false, enabledAt: null, lastVerifiedAt: null, verifiedNumber: null, verifiedName: null, lastTestSentAt: null, revision: null,
};
type Editable = Omit<Settings, 'hasAccessToken' | 'enabledAt' | 'lastVerifiedAt' | 'verifiedNumber' | 'verifiedName' | 'lastTestSentAt' | 'revision'>;
const editable = (s: Settings): Editable => ({
  enabled: s.enabled, phoneNumberId: s.phoneNumberId, businessAccountId: s.businessAccountId, apiVersion: s.apiVersion,
  sendCardOnIssue: s.sendCardOnIssue, sendSessionConfirmation: s.sendSessionConfirmation,
  cardTemplateName: s.cardTemplateName, cardTemplateLanguage: s.cardTemplateLanguage, sessionTemplateName: s.sessionTemplateName, sessionTemplateLanguage: s.sessionTemplateLanguage,
});

function TemplateBox({ title, name, guide }: { title: string; name: string; guide: typeof TEMPLATE_GUIDE.card | typeof TEMPLATE_GUIDE.session }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(guide.body); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  return <div className="rounded-lg border border-slate-200 p-4 space-y-2">
    <p className="font-semibold text-slate-900">{t(title)}</p>
    <p className="text-xs text-slate-500" dir="ltr">{t('Name')}: <b>{name}</b> · {t('Category')}: <b>{guide.category}</b> · {t('Language')}: <b>English</b> · {t('Header')}: <b>{guide.header}</b></p>
    <pre className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs leading-5 text-slate-800" dir="ltr">{guide.body}</pre>
    <p className="text-xs text-slate-500" dir="ltr">{t('Sample values for Meta review')}: {guide.samples.map((v, i) => `{{${i + 1}}} ${v}`).join(' · ')}</p>
    <Button type="button" size="sm" variant="outline" onClick={copy}>{t(copied ? 'Copied' : 'Copy template text')}</Button>
  </div>;
}

export default function WhatsAppSettingsPage() {
  const { t, formatDate } = useLanguage();
  const [saved, setSaved] = useState<Settings>(initial), [form, setForm] = useState<Editable>(editable(initial));
  const [token, setToken] = useState(''), [removeToken, setRemoveToken] = useState(false);
  const [recipient, setRecipient] = useState(''), [testTemplate, setTestTemplate] = useState<'hello_world' | 'session'>('hello_world');
  const [loading, setLoading] = useState(true), [allowed, setAllowed] = useState(false), [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(''), [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setMessage(null);
    try {
      const me = await getJson<{ role: string }>('/api/auth/me');
      if (me.role !== 'SUPER_ADMIN') { setAllowed(false); return; }
      setAllowed(true);
      const data = await getJson<{ settings: Settings }>('/api/settings/whatsapp');
      setLoaded(true); setSaved(data.settings); setForm(editable(data.settings)); setToken(''); setRemoveToken(false);
    } catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : 'WhatsApp settings could not be loaded.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(form) !== JSON.stringify(editable(saved)) || !!token || removeToken;
  function field<K extends keyof Editable>(key: K, value: Editable[K]) { setForm(previous => ({ ...previous, [key]: value })); setMessage(null); }

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy('save'); setMessage(null);
    try {
      const data = await postJson<{ settings: Settings }>('/api/settings/whatsapp', { ...form, accessToken: token || undefined, removeAccessToken: removeToken, revision: saved.revision });
      setSaved(data.settings); setForm(editable(data.settings)); setToken(''); setRemoveToken(false);
      setMessage({ error: false, text: data.settings.enabled ? 'WhatsApp settings saved. Messages will now be sent automatically.' : 'WhatsApp settings saved. Sending is switched off.' });
    } catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : 'WhatsApp settings could not be saved.' }); }
    finally { setBusy(''); }
  }
  async function test(action: 'verify' | 'send') {
    if (busy || dirty) return; setBusy(action); setMessage(null);
    try {
      const result = await postJson<{ settings: Settings; message: string }>('/api/settings/whatsapp/test', { action, ...(action === 'send' ? { recipient, template: testTemplate } : {}) });
      setSaved(result.settings); setForm(editable(result.settings)); setMessage({ error: false, text: result.message });
    } catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : 'WhatsApp test could not be completed.' }); }
    finally { setBusy(''); }
  }

  if (loading) return <div className="empty-state" role="status">{t('Loading WhatsApp settings…')}</div>;
  if (!allowed) return <Card><CardContent><h1>{t('Super Admin access required')}</h1><p className="mt-3 text-sm text-slate-500">{t('Only the Super Admin can configure WhatsApp.')}</p></CardContent></Card>;
  if (!loaded) return <Card><CardContent><div role="alert" className="feedback-banner error">{t(message?.text || 'WhatsApp settings could not be loaded.')}</div><Button className="mt-4" onClick={load}>{t('Try again')}</Button></CardContent></Card>;

  const state = saved.enabled && saved.lastVerifiedAt ? 'Connected · sending on' : saved.enabled ? 'Sending on · not verified' : saved.hasAccessToken ? 'Saved · sending off' : 'Not set up';
  return <div className="space-y-6 email-settings-page">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="section-eyebrow">{t('SUPER ADMIN SETTINGS')}</p><h1>{t('WhatsApp settings')}</h1><p className="mt-2 text-sm text-slate-500">{t('Send membership cards and session confirmations automatically from the clinic WhatsApp number (Meta WhatsApp API).')}</p></div>
      <span className={`settings-state ${saved.enabled && saved.lastVerifiedAt ? 'verified' : ''}`}>{t(state)}</span>
    </div>
    {message && <div role={message.error ? 'alert' : 'status'} className={`feedback-banner ${message.error ? 'error' : 'success'}`}><p>{t(message.text)}</p></div>}

    <div className="email-settings-grid">
      <form onSubmit={save} className="space-y-6" autoComplete="off">
        <Card><CardHeader><CardTitle>{t('1. Connect Meta WhatsApp')}</CardTitle><p className="mt-1 text-sm text-slate-500">{t('Copy these from Meta: WhatsApp Manager / developers.facebook.com → your app → WhatsApp → API Setup.')}</p></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label={t('Permanent access token')} type="password" dir="ltr" value={token} onChange={e => { setToken(e.target.value.trim()); setRemoveToken(false); }} placeholder={saved.hasAccessToken && !removeToken ? t('Leave blank to keep the saved token') : 'EAAG…'} helperText={t(saved.hasAccessToken && !removeToken ? 'A token is stored securely. Its value is never displayed.' : 'Use a permanent System User token, not the 24-hour temporary token.')} maxLength={4096} disabled={!!busy} autoComplete="new-password" /></div>
          {saved.hasAccessToken && <label className="sm:col-span-2 flex items-center gap-2"><input type="checkbox" checked={removeToken} disabled={!!busy} onChange={e => { setRemoveToken(e.target.checked); setToken(''); }} />{t('Remove the saved token when saving')}</label>}
          <Input label={t('Phone Number ID')} dir="ltr" inputMode="numeric" value={form.phoneNumberId} onChange={e => field('phoneNumberId', e.target.value.trim())} placeholder="1234567890123456" helperText={t('Not the phone number itself: the long ID Meta shows under the number.')} disabled={!!busy} />
          <Input label={t('WhatsApp Business Account ID (optional)')} dir="ltr" inputMode="numeric" value={form.businessAccountId} onChange={e => field('businessAccountId', e.target.value.trim())} disabled={!!busy} />
          <Input label={t('Graph API version')} dir="ltr" value={form.apiVersion} onChange={e => field('apiVersion', e.target.value.trim())} helperText={t('Leave as is unless Meta asks you to change it.')} disabled={!!busy} />
        </CardContent></Card>

        <Card><CardHeader><CardTitle>{t('2. Messages')}</CardTitle><p className="mt-1 text-sm text-slate-500">{t('Create these two templates in Meta WhatsApp Manager → Message templates, wait for approval, and keep the names below the same as in Meta.')}</p></CardHeader><CardContent className="space-y-5">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.sendCardOnIssue} disabled={!!busy} onChange={e => field('sendCardOnIssue', e.target.checked)} />{t('Send the membership card automatically when a new card is issued')}</label>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label={t('Card template name')} dir="ltr" value={form.cardTemplateName} onChange={e => field('cardTemplateName', e.target.value.trim())} disabled={!!busy} />
            <Input label={t('Card template language code')} dir="ltr" value={form.cardTemplateLanguage} onChange={e => field('cardTemplateLanguage', e.target.value.trim())} disabled={!!busy} />
          </div>
          <TemplateBox title="Card template (with image header)" name={form.cardTemplateName} guide={TEMPLATE_GUIDE.card} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.sendSessionConfirmation} disabled={!!busy} onChange={e => field('sendSessionConfirmation', e.target.checked)} />{t('Send a confirmation automatically every time a session is recorded')}</label>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label={t('Session template name')} dir="ltr" value={form.sessionTemplateName} onChange={e => field('sessionTemplateName', e.target.value.trim())} disabled={!!busy} />
            <Input label={t('Session template language code')} dir="ltr" value={form.sessionTemplateLanguage} onChange={e => field('sessionTemplateLanguage', e.target.value.trim())} disabled={!!busy} />
          </div>
          <TemplateBox title="Session confirmation template" name={form.sessionTemplateName} guide={TEMPLATE_GUIDE.session} />
        </CardContent></Card>

        <Card><CardHeader><CardTitle>{t('3. Switch on')}</CardTitle></CardHeader><CardContent className="space-y-3">
          <label className="flex items-center gap-3 text-base font-semibold"><input type="checkbox" className="h-5 w-5" checked={form.enabled} disabled={!!busy} onChange={e => field('enabled', e.target.checked)} />{t('WhatsApp sending is ON')}</label>
          <p className="text-sm text-slate-500">{t('When on, messages go out automatically to the phone number in each patient profile. Cards issued before WhatsApp was switched on are not sent automatically; use “Send card on WhatsApp” on the patient page for those.')}</p>
        </CardContent></Card>

        <div className="form-actions"><p className="text-sm text-slate-500" role="status">{t(dirty ? 'You have unsaved changes.' : 'All changes saved.')}</p><div className="flex gap-3">
          <Button type="button" variant="outline" disabled={!dirty || !!busy} onClick={() => { setForm(editable(saved)); setToken(''); setRemoveToken(false); setMessage(null); }}>{t('Discard changes')}</Button>
          <Button type="submit" disabled={!dirty || !!busy} isLoading={busy === 'save'}>{t('Save WhatsApp settings')}</Button>
        </div></div>
      </form>

      <aside className="space-y-6"><Card><CardHeader><CardTitle>{t('4. Check and test')}</CardTitle></CardHeader><CardContent className="space-y-5">
        <p className="text-sm leading-6 text-slate-500">{t('Save first, then check the connection and send a test to your own phone.')}</p>
        {dirty && <p className="text-xs text-amber-700">{t('Save or discard changes before testing.')}</p>}
        <Button type="button" className="w-full" variant="outline" disabled={dirty || !saved.hasAccessToken || !saved.phoneNumberId || !!busy} isLoading={busy === 'verify'} onClick={() => test('verify')}>{t('Check connection')}</Button>
        {saved.verifiedNumber && <p className="text-xs text-green-700" dir="ltr">{saved.verifiedName} · {saved.verifiedNumber}</p>}
        <Input label={t('Test phone number')} dir="ltr" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="+968 9123 4567" disabled={!!busy} />
        <div><label htmlFor="wa-test-template">{t('Test message')}</label><select id="wa-test-template" className="mt-1 w-full px-3 py-2" value={testTemplate} onChange={e => setTestTemplate(e.target.value as 'hello_world' | 'session')} disabled={!!busy}>
          <option value="hello_world">{t("Meta's hello_world sample")}</option>
          <option value="session">{t('Session confirmation template (test values)')}</option>
        </select></div>
        <Button type="button" className="w-full" disabled={dirty || !saved.hasAccessToken || !saved.phoneNumberId || !!busy || recipient.replace(/\D/g, '').length < 8} isLoading={busy === 'send'} onClick={() => test('send')}>{t('Send test message')}</Button>
        {saved.lastVerifiedAt && <p className="text-xs text-slate-500">{t('Last checked')}: {formatDate(saved.lastVerifiedAt)}</p>}
        {saved.lastTestSentAt && <p className="text-xs text-slate-500">{t('Last test accepted')}: {formatDate(saved.lastTestSentAt)}</p>}
      </CardContent></Card></aside>
    </div>
  </div>;
}
