'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getJson, postJson } from '@/lib/api-client';
interface Settings {
  host: string; port: number; security: 'TLS' | 'STARTTLS'; username: string; fromName: string; fromEmail: string; replyTo: string;
  hasPassword: boolean; revision: string | null; lastVerifiedAt: string | null; lastTestSentAt: string | null;
}
const initial: Settings = {host: '', port: 587, security: 'STARTTLS', username: '', fromName: 'Grand Medical Care', fromEmail: '', replyTo: '', hasPassword: false, revision: null, lastVerifiedAt: null, lastTestSentAt: null};
export default function EmailSettingsPage() {
  const {t, formatDate} = useLanguage();
  const [saved, setSaved] = useState<Settings>(initial), [form, setForm] = useState<Settings>(initial);
  const [password, setPassword] = useState(''), [removePassword, setRemovePassword] = useState(false);
  const [recipient, setRecipient] = useState(''), [loading, setLoading] = useState(true), [allowed, setAllowed] = useState(false), [loaded,setLoaded]=useState(false);
  const [busy, setBusy] = useState(''), [message, setMessage] = useState<{error: boolean; text: string} | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setMessage(null);
    try {
      const me = await getJson<{role: string}>('/api/auth/me');
      if(me.role !== 'SUPER_ADMIN') {setAllowed(false); return;}
      setAllowed(true);
      const data = await getJson<{settings: Settings; testRecipient: string}>('/api/settings/email');
      setLoaded(true);setSaved(data.settings); setForm(data.settings); setRecipient(data.testRecipient); setPassword(''); setRemovePassword(false);
    } catch(error) {setMessage({error: true, text: error instanceof Error ? error.message : 'Email settings could not be loaded.'});}
    finally {setLoading(false);}
  }, []);
  useEffect(() => {load();}, [load]);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved) || !!password || removePassword;
  useEffect(() => {
    if(!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = '';};
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function field<K extends keyof Settings>(key: K, value: Settings[K]) {setForm(previous => ({...previous, [key]: value})); setMessage(null);}
  async function save(event: React.FormEvent) {
    event.preventDefault(); if(busy) return; setBusy('save'); setMessage(null);
    try {
      const data = await postJson<{settings: Settings}>('/api/settings/email', {host: form.host, port: form.port, security: form.security, username: form.username, fromName: form.fromName, fromEmail: form.fromEmail, replyTo: form.replyTo, password: password || undefined, removePassword, revision: saved.revision});
      setSaved(data.settings); setForm(data.settings); setPassword(''); setRemovePassword(false);
      setMessage({error: false, text: 'Email settings saved. Verify the connection next.'});
    } catch(error) {setMessage({error: true, text: error instanceof Error ? error.message : 'Email settings could not be saved.'});}
    finally {setBusy('');}
  }
  async function test(action: 'verify' | 'send') {
    if(busy || dirty) return; setBusy(action); setMessage(null);
    try {
      const result = await postJson<{settings: Settings; message: string}>('/api/settings/email/test', {action, revision: saved.revision, ...(action === 'send' ? {recipient} : {})});
      setSaved(result.settings); setForm(result.settings); setMessage({error: false, text: result.message});
    } catch(error) {setMessage({error: true, text: error instanceof Error ? error.message : 'Email test could not be completed.'});}
    finally {setBusy('');}
  }
  if(loading) return <div className="empty-state" role="status">{t('Loading email settings…')}</div>;
  if(!allowed) return <Card><CardContent><h1>{t('Super Admin access required')}</h1><p className="mt-3 text-sm text-slate-500">{t('Only the Super Admin can configure outgoing email.')}</p></CardContent></Card>;
  if(!loaded) return <Card><CardContent><div role="alert" className="feedback-banner error">{t(message?.text || 'Email settings could not be loaded.')}</div><Button className="mt-4" onClick={load}>{t('Try again')}</Button></CardContent></Card>;
  return <div className="space-y-6 email-settings-page">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="section-eyebrow">{t('SUPER ADMIN SETTINGS')}</p><h1>{t('Email settings')}</h1><p className="mt-2 text-sm text-slate-500">{t('Connect the clinic mailbox and check outgoing email delivery.')}</p></div><span className={`settings-state ${saved.lastVerifiedAt ? 'verified' : ''}`}>{t(saved.lastVerifiedAt ? 'Connection verified' : saved.hasPassword ? 'Saved · not verified' : 'Not configured')}</span></div>
    {message && <div role={message.error ? 'alert' : 'status'} className={`feedback-banner ${message.error ? 'error' : 'success'}`}><p>{t(message.text)}</p>{message.error && <button type="button" onClick={load} disabled={!!busy}>{t('Reload settings')}</button>}</div>}
    <div className="email-settings-grid"><form onSubmit={save} className="space-y-6" autoComplete="off"><Card><CardHeader><CardTitle>{t('1. SMTP connection')}</CardTitle><p className="mt-1 text-sm text-slate-500">{t('Use the outgoing server details supplied by your email provider.')}</p></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      <Input label={t('SMTP server')} dir="ltr" placeholder="smtp.example.com" value={form.host} onChange={e=>field('host',e.target.value)} required maxLength={253} disabled={!!busy} />
      <div><label htmlFor="mail-security">{t('Encryption and port')}</label><select id="mail-security" className="mt-1 w-full px-3 py-2" value={`${form.security}:${form.port}`} onChange={e=>{const [security,port]=e.target.value.split(':');setForm(f=>({...f,security:security as Settings['security'],port:Number(port)}));}} disabled={!!busy}><option value="STARTTLS:587">STARTTLS · 587</option><option value="TLS:465">TLS · 465</option><option value="STARTTLS:2525">STARTTLS · 2525</option></select></div>
      <Input label={t('SMTP username')} dir="ltr" value={form.username} onChange={e=>field('username',e.target.value)} required maxLength={254} disabled={!!busy} autoComplete="off" />
      <Input label={t('SMTP password / app password')} type="password" value={password} onChange={e=>{setPassword(e.target.value);setRemovePassword(false);}} placeholder={saved.hasPassword && !removePassword ? t('Leave blank to keep the saved password') : t('Enter the SMTP password')} helperText={t(saved.hasPassword && !removePassword ? 'A password is stored securely. Its value is never displayed.' : 'Use an app password if your provider requires one.')} maxLength={1024} disabled={!!busy} autoComplete="new-password" />
      {saved.hasPassword && <label className="sm:col-span-2 flex items-center gap-2"><input type="checkbox" checked={removePassword} disabled={!!busy} onChange={e=>{setRemovePassword(e.target.checked);setPassword('');}} />{t('Remove the saved SMTP password when saving')}</label>}
    </CardContent></Card><Card><CardHeader><CardTitle>{t('2. Sender identity')}</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      <Input label={t('Sender name')} value={form.fromName} onChange={e=>field('fromName',e.target.value)} required maxLength={100} disabled={!!busy}/>
      <Input label={t('Sender email')} type="email" value={form.fromEmail} onChange={e=>field('fromEmail',e.target.value)} required disabled={!!busy}/>
      <Input label={t('Reply-to email (optional)')} type="email" value={form.replyTo} onChange={e=>field('replyTo',e.target.value)} disabled={!!busy}/>
      <p className="text-xs leading-6 text-slate-500">{t('The sender address must be permitted by your email provider. Hosting and email subscriptions are managed separately.')}</p>
    </CardContent></Card><div className="form-actions"><p className="text-sm text-slate-500" role="status">{t(dirty ? 'You have unsaved changes.' : 'All changes saved.')}</p><div className="flex gap-3"><Button type="button" variant="outline" disabled={!dirty || !!busy} onClick={()=>{setForm(saved);setPassword('');setRemovePassword(false);setMessage(null);}}>{t('Discard changes')}</Button><Button type="submit" disabled={!dirty || !!busy} isLoading={busy==='save'}>{t('Save email settings')}</Button></div></div></form>
      <aside className="space-y-6"><Card><CardHeader><CardTitle>{t('3. Verify and test')}</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-6 text-slate-500">{t('Save your settings, verify the connection, then send a test to an address you control.')}</p>{dirty && <p className="text-xs text-amber-700">{t('Save or discard changes before testing.')}</p>}
      <Button type="button" className="w-full" variant="outline" disabled={dirty || !saved.hasPassword || !!busy} isLoading={busy==='verify'} onClick={()=>test('verify')}>{t('Verify connection')}</Button>
      <Input label={t('Test recipient')} type="email" value={recipient} onChange={e=>setRecipient(e.target.value)} disabled={!!busy}/><Button type="button" className="w-full" disabled={dirty || !saved.hasPassword || !!busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)} isLoading={busy==='send'} onClick={()=>test('send')}>{t('Send test email')}</Button>
      <p className="text-xs leading-6 text-slate-500">{t('Only the test recipient receives this message. No patient details are included.')}</p>
      {saved.lastVerifiedAt && <p className="text-xs text-slate-500">{t('Last verified')}: {formatDate(saved.lastVerifiedAt)}</p>}{saved.lastTestSentAt && <p className="text-xs text-slate-500">{t('Last test accepted')}: {formatDate(saved.lastTestSentAt)}</p>}
      </CardContent></Card></aside>
    </div>
  </div>;
}
