'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MembershipCardPreview } from '@/components/cards/MembershipCardPreview';
import { deleteJson, getJson, patchJson, postJson } from '@/lib/api-client';
import { downloadCardPDF, renderCardImage } from '@/lib/pdf';
import { buildCardIssuedMessage, buildCardShareMessage, buildWelcomeMessage, buildWhatsAppLink, buildWhatsAppWebLink } from '@/lib/whatsapp';
import { formatMembershipType } from '@/lib/clinic';

interface MemberDetailsClientProps {
  memberId: string;
}

interface MembershipCardRecord {
  id: string;
  cardNumber: string;
  barcode: string;
  expiryDate: string;
  status?: string;
}

interface TreatmentBrief {
  id: string;
  name: string;
  category: string;
}

interface PackageBrief {
  id: string;
  name: string;
  sessionCount: number;
  price: number;
  validityMonths: number;
  treatment: TreatmentBrief;
}

interface MemberPackageRecord {
  id: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiryDate: string;
  status: string;
  package: PackageBrief;
}

interface SessionHistoryRecord {
  id: string;
  sessionNumber?: number;
  status: string;
  completedAt?: string;
  notes?: string;
  treatment?: {
    name: string;
  };
  memberPackage?: {
    package: {
      name: string;
    };
  };
  processedByUser?: {
    name: string;
  };
}

interface MemberResponse {
  id: string;
  memberId: string;
  name: string;
  email?: string;
  phone: string;
  membershipType: string;
  status: string;
  expiryDate: string;
  gender?: string;
  address?: string;
  dateOfBirth?: string;
  cards: MembershipCardRecord[];
  packages?: MemberPackageRecord[];
  sessions?: SessionHistoryRecord[];
  createdByUser?: {
    name: string;
    email: string;
  };
}

type ConfirmAction =
  | { kind: 'deactivate' | 'reactivate' | 'deactivateCard' | 'reissueCard' }
  | { kind: 'cancelPackage' | 'undoSession'; id: string; label: string };

const toDateInput = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : '');

interface TreatmentPackageResponse {
  id: string;
  name: string;
  description?: string;
  sessionCount: number;
  price: number;
  validityMonths: number;
  treatment: TreatmentBrief;
}

export function MemberDetailsClient({ memberId }: MemberDetailsClientProps) {
  const { t, formatDate: formatDisplayDate } = useLanguage();
  const [loadError,setLoadError]=useState(''), [actionError,setActionError]=useState('');
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [availablePackages, setAvailablePackages] = useState<TreatmentPackageResponse[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isIssuingCard, setIsIssuingCard] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPurchasingPackage, setIsPurchasingPackage] = useState(false);
  const [packageMessage, setPackageMessage] = useState<string>('');

  // Super Admin management
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', memberId: '', phone: '', email: '', gender: '', address: '', membershipType: 'STANDARD', status: 'ACTIVE', expiryDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState('');
  const [packageForm, setPackageForm] = useState({ remainingSessions: 0, usedSessions: 0, expiryDate: '', status: 'ACTIVE' });

  // WhatsApp card sending
  const [cardShareUrl, setCardShareUrl] = useState('');
  const [cardImage, setCardImage] = useState<Blob | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<{ type: 'success' | 'error'; text: string; copied?: boolean } | null>(null);
  const [isPreparingWhatsapp, setIsPreparingWhatsapp] = useState(false);
  const adminPanelRef = useRef<HTMLDivElement | null>(null);
  const frontCardRef = useRef<HTMLDivElement | null>(null);
  const backCardRef = useRef<HTMLDivElement | null>(null);

  const activeCard = useMemo(
    () => member?.cards?.find((card) => !card.status || card.status === 'ACTIVE' || card.status === 'PRINTED') || null,
    [member]
  );
  const activePackages = useMemo(
    () => member?.packages?.filter((pkg) => pkg.status === 'ACTIVE' && pkg.remainingSessions > 0) ?? [],
    [member]
  );

  const fetchMember = async () => {
    try {
      setIsLoading(true);setLoadError('');
      const response = await getJson<MemberResponse>(`/api/members/${memberId}`);
      setMember(response);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load the patient profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailablePackages = async () => {
    try {
      const treatments = await getJson<Array<{ packages: TreatmentPackageResponse[] }>>('/api/treatments');
      setAvailablePackages(
        treatments.flatMap((treatment) => treatment.packages || [])
      );
    } catch (error) {
      console.error('Failed to load available packages:', error);
    }
  };

  useEffect(() => {
    fetchMember();
    fetchAvailablePackages();
  }, [memberId]);

  useEffect(() => {
    getJson<{ role?: string }>('/api/auth/me')
      .then((me) => setIsSuperAdmin(me.role === 'SUPER_ADMIN'))
      .catch(() => setIsSuperAdmin(false));
  }, []);

  // Prepare the card link and the card picture in advance, so the button works instantly.
  useEffect(() => {
    setCardShareUrl('');
    setCardImage(null);
    if (!member || !activeCard) return;
    let cancelled = false;
    getJson<{ url: string }>(`/api/members/${member.id}/card-share`)
      .then((response) => { if (!cancelled) setCardShareUrl(response.url); })
      .catch(() => {});
    const timer = window.setTimeout(() => {
      if (!frontCardRef.current) return;
      renderCardImage(frontCardRef.current, backCardRef.current || undefined)
        .then((blob) => { if (!cancelled) setCardImage(blob); })
        .catch(() => {});
    }, 800);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [member?.id, member?.name, member?.expiryDate, member?.memberId, activeCard?.id]);

  const downloadCardImage = (blob: Blob) => {
    if (!member) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${member.memberId}-membership-card.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSendCardWhatsApp = async () => {
    if (!member || !activeCard) return;
    setWhatsappStatus(null);
    setIsPreparingWhatsapp(true);
    try {
      let url = cardShareUrl;
      if (!url) {
        url = (await getJson<{ url: string }>(`/api/members/${member.id}/card-share`)).url;
        setCardShareUrl(url);
      }

      // 1) Copy the card picture so reception can paste it into the chat.
      let copied = false;
      let image = cardImage;
      try {
        if (!image && frontCardRef.current) image = await renderCardImage(frontCardRef.current, backCardRef.current || undefined);
        if (image && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
          copied = true;
        }
      } catch {
        copied = false;
      }

      // 2) Open WhatsApp Web to the member's own phone number, message typed in.
      const message = buildCardShareMessage(member.name, member.memberId, member.expiryDate, url);
      const opened = window.open(buildWhatsAppWebLink(member.phone, message), 'gmc-whatsapp');

      if (!copied && image) downloadCardImage(image);
      setWhatsappStatus({
        type: opened ? 'success' : 'error',
        copied,
        text: !opened
          ? 'Chrome blocked the WhatsApp tab. Allow pop-ups for this site, then press the button again.'
          : copied
            ? 'WhatsApp Web opened in another tab with the message and card link typed in. The card picture is copied: click in the chat, press Ctrl+V to paste it, then press Send.'
            : 'WhatsApp Web opened in another tab with the message and card link typed in. The card picture was downloaded: attach it with the paperclip in the chat, then press Send.',
      });
    } catch (error) {
      setWhatsappStatus({ type: 'error', text: error instanceof Error ? error.message : 'Could not prepare the WhatsApp message.' });
    } finally {
      setIsPreparingWhatsapp(false);
    }
  };

  useEffect(() => {
    if (confirmAction || isEditing) adminPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [confirmAction, isEditing]);

  const startEditing = () => {
    if (!member) return;
    setEditForm({
      name: member.name || '',
      memberId: member.memberId || '',
      phone: member.phone || '',
      email: member.email || '',
      gender: member.gender || '',
      address: member.address || '',
      membershipType: member.membershipType || 'STANDARD',
      status: member.status || 'ACTIVE',
      expiryDate: toDateInput(member.expiryDate),
    });
    setNotice('');
    setActionError('');
    setIsEditing(true);
  };

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member) return;
    try {
      setIsSaving(true);
      setActionError('');
      await patchJson(`/api/members/${member.id}`, {
        name: editForm.name.trim(),
        memberId: editForm.memberId.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        ...(editForm.gender ? { gender: editForm.gender } : {}),
        address: editForm.address.trim(),
        membershipType: editForm.membershipType,
        status: editForm.status,
        ...(editForm.expiryDate ? { expiryDate: editForm.expiryDate } : {}),
      });
      setIsEditing(false);
      setNotice('Patient details updated.');
      await fetchMember();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update the patient.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingPackage = (pkg: MemberPackageRecord) => {
    setEditingPackageId(pkg.id);
    setPackageForm({ remainingSessions: pkg.remainingSessions, usedSessions: pkg.usedSessions, expiryDate: toDateInput(pkg.expiryDate), status: pkg.status });
  };

  const handleSavePackage = async (pkg: MemberPackageRecord) => {
    try {
      setIsSaving(true);
      setActionError('');
      await patchJson(`/api/member-packages/${pkg.id}`, {
        remainingSessions: Number(packageForm.remainingSessions),
        usedSessions: Number(packageForm.usedSessions),
        ...(packageForm.expiryDate ? { expiryDate: packageForm.expiryDate } : {}),
        ...(packageForm.status !== pkg.status ? { status: packageForm.status } : {}),
      });
      setEditingPackageId('');
      setNotice('Package updated.');
      await fetchMember();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update the package.');
    } finally {
      setIsSaving(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!member || !confirmAction) return;
    try {
      setIsConfirming(true);
      setActionError('');
      switch (confirmAction.kind) {
        case 'deactivate':
          await deleteJson(`/api/members/${member.id}`);
          setNotice('Patient deactivated. Their history is kept and they can be reactivated at any time.');
          break;
        case 'reactivate':
          await patchJson(`/api/members/${member.id}`, { status: 'ACTIVE' });
          setNotice('Patient reactivated.');
          break;
        case 'cancelPackage':
          await deleteJson(`/api/member-packages/${confirmAction.id}`);
          setNotice('Package cancelled.');
          break;
        case 'undoSession':
          await deleteJson(`/api/sessions/${confirmAction.id}`);
          setNotice('Session undone and returned to the package balance.');
          break;
        case 'deactivateCard':
          await postJson('/api/cards/manage', { memberId: member.id, action: 'deactivate' });
          setNotice('Membership card deactivated. It will no longer work at reception.');
          break;
        case 'reissueCard':
          await postJson('/api/cards/manage', { memberId: member.id, action: 'reissue' });
          setNotice('New membership card issued. The old card no longer works.');
          break;
      }
      setConfirmAction(null);
      await fetchMember();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The action could not be completed.');
    } finally {
      setIsConfirming(false);
    }
  };

  const confirmText = (action: ConfirmAction): { title: string; body: string; button: string } => {
    switch (action.kind) {
      case 'deactivate':
        return { title: 'Deactivate this patient?', body: 'The patient is marked inactive and no sessions can be recorded for them. Their card, packages and history are kept, and you can reactivate them later.', button: 'Deactivate patient' };
      case 'reactivate':
        return { title: 'Reactivate this patient?', body: 'The patient becomes active again and sessions can be recorded.', button: 'Reactivate patient' };
      case 'cancelPackage':
        return { title: 'Cancel this package?', body: 'The remaining sessions in this package can no longer be used. The package stays in the history.', button: 'Cancel package' };
      case 'undoSession':
        return { title: 'Undo this session?', body: 'The session is marked as cancelled and one session is given back to the package.', button: 'Undo session' };
      case 'deactivateCard':
        return { title: 'Deactivate the membership card?', body: 'The current card will stop working when scanned or typed at reception. The patient can still be found by patient ID.', button: 'Deactivate card' };
      case 'reissueCard':
        return { title: 'Issue a new membership card?', body: 'The current card stops working and a new card with a new number and barcode is created. Print the new card for the patient.', button: 'Issue new card' };
    }
  };

  useEffect(() => {
    if (availablePackages.length && !selectedPackageId) {
      setSelectedPackageId(availablePackages[0].id);
    }
  }, [availablePackages, selectedPackageId]);

  const handleIssueCard = async () => {
    if (!member) {
      return;
    }

    try {
      setIsIssuingCard(true);setActionError('');
      await postJson('/api/cards/generate', { memberId: member.id });
      await fetchMember();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not issue the membership card.');
    } finally {
      setIsIssuingCard(false);
    }
  };

  const handleExportPdf = async () => {
    if (!frontCardRef.current || !member || !activeCard) {
      return;
    }

    try {
      setIsExportingPdf(true);setActionError('');
      await downloadCardPDF(
        frontCardRef.current,
        backCardRef.current || undefined,
        `${member.memberId}-membership-card.pdf`
      );
    } catch (error) {
      setActionError('Could not export the card PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePurchasePackage = async () => {
    if (!member || !selectedPackageId) {
      setPackageMessage('Please select a package before purchasing.');
      return;
    }

    try {
      setPackageMessage('');
      setIsPurchasingPackage(true);
      await postJson(`/api/members/${member.id}/packages`, {
        packageId: selectedPackageId,
      });
      setPackageMessage('Package purchased successfully and session balance updated.');
      await fetchMember();
    } catch (error) {
      setPackageMessage(error instanceof Error ? error.message : 'Failed to purchase package.');
      console.error('Package purchase error:', error);
    } finally {
      setIsPurchasingPackage(false);
    }
  };

  const openWhatsApp = (message: string) => {
    if (!member) {
      return;
    }

    window.open(buildWhatsAppLink(member.phone, message), '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return <div className="py-16 text-center text-slate-500">{t("Loading member details...")}</div>;
  }

  if(loadError) return <Card><CardContent><div className="feedback-banner error" role="alert">{t(loadError)}</div><div className="mt-4 flex gap-4"><Button onClick={fetchMember}>{t('Try again')}</Button><Link href="/dashboard/members" className="patient-name-link">{t('Back to patients')}</Link></div></CardContent></Card>;
  if (!member) {
    return (
      <Card className="surface-panel rounded-xl border-0 shadow-none">
        <CardContent className="py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">{t("Patient not found")}</p>
          <Link href="/dashboard/members" className="mt-4 inline-block text-primary">
            {t("Return to members list")} </Link>
        </CardContent>
      </Card>
    );
  }

  const welcomeMessage = buildWelcomeMessage(member.name, member.memberId, member.expiryDate);
  const cardMessage = buildCardIssuedMessage(member.name, member.memberId, member.expiryDate);

  return (
    <div className="space-y-8">{actionError && <div role="alert" className="feedback-banner error">{t(actionError)}</div>}
      {notice && <div role="status" className="feedback-banner success">{t(notice)}</div>}
      {whatsappStatus && (
        <div role={whatsappStatus.type === 'success' ? 'status' : 'alert'} className={`feedback-banner ${whatsappStatus.type}`}>
          <p>{t(whatsappStatus.text)}</p>
          <p className="mt-1 text-sm">{t('Sending to')} <bdi dir="ltr">{member.phone}</bdi></p>
          {whatsappStatus.type === 'success' && whatsappStatus.copied && cardImage && (
            <button type="button" className="mt-2 text-sm underline" onClick={() => downloadCardImage(cardImage)}>{t('Download the card picture instead')}</button>
          )}
        </div>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/members" className="text-sm font-medium text-primary">
            {t("Back to patients")} </Link>
          <h1 className="page-title mt-3">{member.name}</h1>
          <p className="page-subtitle mt-3">
            {t("Grand Medical Care patient profile, package session balance, and printable membership card details.")} </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            className="rounded-lg bg-green-700 hover:bg-green-800"
            isLoading={isPreparingWhatsapp}
            disabled={!activeCard}
            title={activeCard ? undefined : t('Issue the membership card before sending it.')}
            onClick={handleSendCardWhatsApp}
          >
            {t("Send card on WhatsApp")}
          </Button>
          <Button variant="outline" className="rounded-lg border-primary text-primary" onClick={() => openWhatsApp(welcomeMessage)}>
            {t("WhatsApp Welcome")} </Button>
          <Button variant="outline" className="rounded-lg border-primary text-primary" onClick={() => openWhatsApp(cardMessage)}>
            {t("WhatsApp Card Ready")} </Button>
          <Button
            variant="primary"
            className="rounded-lg bg-primary hover:bg-primary/90"
            isLoading={isIssuingCard}
            onClick={handleIssueCard}
          >
            {activeCard ? t("Recheck Existing Card") : t("Issue Membership Card")}
          </Button>
        </div>
      </div>

      {isSuperAdmin && (
        <div ref={adminPanelRef}>
        <Card className="surface-panel rounded-xl border border-amber-200 shadow-none">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("Super Admin controls")}</CardTitle>
              <p className="mt-1 text-sm text-slate-500">{t("Only the Super Admin can see and use these options.")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={startEditing} disabled={isEditing}>{t("Edit patient")}</Button>
              {member.status === 'INACTIVE' ? (
                <Button variant="outline" onClick={() => setConfirmAction({ kind: 'reactivate' })}>{t("Reactivate patient")}</Button>
              ) : (
                <Button variant="outline" className="border-red-300 text-red-700" onClick={() => setConfirmAction({ kind: 'deactivate' })}>{t("Deactivate patient")}</Button>
              )}
            </div>
          </CardHeader>
          {(confirmAction || isEditing) && (
            <CardContent className="space-y-4">
              {confirmAction && (() => {
                const text = confirmText(confirmAction);
                return (
                  <section className="session-confirmation" aria-label={t(text.title)}>
                    <h3>{t(text.title)}</h3>
                    {'label' in confirmAction && <p><bdi>{confirmAction.label}</bdi></p>}
                    <p>{t(text.body)}</p>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={runConfirmedAction} isLoading={isConfirming}>{t(text.button)}</Button>
                      <Button variant="outline" disabled={isConfirming} onClick={() => setConfirmAction(null)}>{t("Cancel")}</Button>
                    </div>
                  </section>
                );
              })()}
              {isEditing && (
                <form onSubmit={handleSaveEdit} className="grid gap-4 sm:grid-cols-2">
                  {([
                    ['name', 'Patient Name', 'text'],
                    ['memberId', 'Patient ID', 'text'],
                    ['phone', 'Phone', 'tel'],
                    ['email', 'Email', 'email'],
                    ['expiryDate', 'Expiry Date', 'date'],
                  ] as const).map(([field, label, type]) => (
                    <label key={field} className="block text-sm font-medium text-gray-700">
                      {t(label)}
                      <input
                        type={type}
                        dir={field === 'name' ? undefined : 'ltr'}
                        required={field === 'name' || field === 'memberId' || field === 'phone'}
                        value={editForm[field]}
                        onChange={(event) => setEditForm((current) => ({ ...current, [field]: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                  <label className="block text-sm font-medium text-gray-700">
                    {t("Gender")}
                    <select value={editForm.gender} onChange={(event) => setEditForm((current) => ({ ...current, gender: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                      <option value="">{t("Not specified")}</option>
                      <option value="MALE">{t("Male")}</option>
                      <option value="FEMALE">{t("Female")}</option>
                      <option value="OTHER">{t("Other")}</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("Membership Type")}
                    <select value={editForm.membershipType} onChange={(event) => setEditForm((current) => ({ ...current, membershipType: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                      {['STANDARD', 'PREMIUM', 'CORPORATE'].map((type) => <option key={type} value={type}>{t(formatMembershipType(type))}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("Status")}
                    <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                      {['ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED'].map((status) => <option key={status} value={status}>{t(status)}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                    {t("Address")}
                    <input type="text" value={editForm.address} onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <div className="flex flex-wrap gap-3 sm:col-span-2">
                    <Button type="submit" isLoading={isSaving}>{t("Save changes")}</Button>
                    <Button type="button" variant="outline" disabled={isSaving} onClick={() => setIsEditing(false)}>{t("Cancel")}</Button>
                  </div>
                </form>
              )}
            </CardContent>
          )}
        </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="surface-panel rounded-xl border-0 shadow-none">
          <CardHeader>
            <CardTitle>{t("Patient profile")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("Patient ID")}</p>
              <p className="mt-1 font-semibold text-slate-900">{member.memberId}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("Membership Type")}</p>
              <p className="mt-1 font-semibold text-slate-900">{t(formatMembershipType(member.membershipType))}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("Phone")}</p>
              <p className="mt-1 font-semibold text-slate-900">{member.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("Email")}</p>
              <p className="mt-1 font-semibold text-slate-900">{member.email || t("N/A")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("Status")}</p>
              <p className="mt-1 font-semibold text-slate-900">{t(member.status)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("Expiry Date")}</p>
              <p className="mt-1 font-semibold text-slate-900">{formatDisplayDate(member.expiryDate)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("Address")}</p>
              <p className="mt-1 font-semibold text-slate-900">{member.address || t("N/A")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel rounded-xl border-0 shadow-none">
          <CardHeader>
            <CardTitle>{t("Card status")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("Current state")}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {activeCard ? t("Membership card issued") : t("Waiting for first card issuance")}
              </p>
            </div>
            {activeCard ? (
              <div className="space-y-2 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-900">{t("Card Number:")}</span> {activeCard.cardNumber}</p>
                <p><span className="font-semibold text-slate-900">{t("Barcode:")}</span> {activeCard.barcode}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {t("Use the issue button to create the first Grand Medical Care PVC card and barcode for this member.")} </p>
            )}
            {isSuperAdmin && (
              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                {activeCard && (
                  <Button variant="outline" size="sm" className="border-red-300 text-red-700" onClick={() => setConfirmAction({ kind: 'deactivateCard' })}>{t("Deactivate card")}</Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setConfirmAction({ kind: 'reissueCard' })}>{t("Issue new card")}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="surface-panel rounded-xl border-0 shadow-none">
          <CardHeader>
            <CardTitle>{t("Package balances")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSuperAdmin && member.packages?.length ? (
              <div className="space-y-4">
                {member.packages.map((pkg) => (
                  <div key={pkg.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{pkg.package.name}</p>
                        <p className="text-sm text-slate-500">{pkg.package.treatment.name}</p>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${pkg.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{t(pkg.status)}</span>
                    </div>
                    {editingPackageId === pkg.id ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-4">
                        <label className="block text-sm font-medium text-gray-700">
                          {t("Used sessions")}
                          <input type="number" min={0} dir="ltr" value={packageForm.usedSessions} onChange={(event) => setPackageForm((current) => ({ ...current, usedSessions: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("Remaining Sessions")}
                          <input type="number" min={0} dir="ltr" value={packageForm.remainingSessions} onChange={(event) => setPackageForm((current) => ({ ...current, remainingSessions: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("Expiry Date")}
                          <input type="date" dir="ltr" value={packageForm.expiryDate} onChange={(event) => setPackageForm((current) => ({ ...current, expiryDate: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("Status")}
                          <select value={packageForm.status} onChange={(event) => setPackageForm((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                            {['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'].map((status) => <option key={status} value={status}>{t(status)}</option>)}
                          </select>
                        </label>
                        <div className="flex flex-wrap gap-3 sm:col-span-4">
                          <Button size="sm" isLoading={isSaving} onClick={() => handleSavePackage(pkg)}>{t("Save changes")}</Button>
                          <Button size="sm" variant="outline" disabled={isSaving} onClick={() => setEditingPackageId('')}>{t("Cancel")}</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1">{pkg.remainingSessions} {t("left")}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{t("Used")} {pkg.usedSessions}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{t("Expires")} {formatDisplayDate(pkg.expiryDate)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Button size="sm" variant="outline" onClick={() => startEditingPackage(pkg)}>{t("Edit package")}</Button>
                          {pkg.status !== 'CANCELLED' && (
                            <Button size="sm" variant="outline" className="border-red-300 text-red-700" onClick={() => setConfirmAction({ kind: 'cancelPackage', id: pkg.id, label: pkg.package.name })}>{t("Cancel package")}</Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : member.packages?.length ? (
              <div className="space-y-4">
                {activePackages.length === 0 ? (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    {t("No active package balance is available. Add a new package to give this member sessions.")} </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {activePackages.map((pkg) => (
                      <div key={pkg.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-900">{pkg.package.name}</p>
                        <p className="text-sm text-slate-500">{pkg.package.treatment.name}</p>
                        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1">{pkg.remainingSessions} {t("left")}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{t("Used")} {pkg.usedSessions}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{t("Expires")} {formatDisplayDate(pkg.expiryDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("No packages have been purchased for this member yet.")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel rounded-xl border-0 shadow-none">
          <CardHeader>
            <CardTitle>{t("Purchase package")}</CardTitle>
          </CardHeader>
          <CardContent>
            {packageMessage && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {t(packageMessage)}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="field-components-members-MemberDetailsClient-tsx-1" className="mb-2 block text-sm font-medium text-gray-700">{t("Choose package")}</label>
                <select id="field-components-members-MemberDetailsClient-tsx-1"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedPackageId}
                  onChange={(event) => setSelectedPackageId(event.target.value)}
                >
                  {availablePackages.length === 0 ? (
                    <option value="">{t("No service packages configured")}</option>
                  ) : (
                    availablePackages.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} • {option.treatment.name} • {option.sessionCount} {t("sessions")} </option>
                    ))
                  )}
                </select>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={handlePurchasePackage}
                isLoading={isPurchasingPackage}
                disabled={!selectedPackageId || availablePackages.length === 0}
              >
                {t("Add session package")} </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeCard && (
        <Card className="surface-panel rounded-xl border-0 shadow-none">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-200/80 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("Printable membership card")}</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {t("Front and back PVC card layout sized for professional printing.")} </p>
            </div>
            <Button
              variant="primary"
              className="rounded-lg bg-primary hover:bg-primary/90"
              isLoading={isExportingPdf}
              onClick={handleExportPdf}
            >
              {t("Export PDF")} </Button>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-2">
            <div ref={frontCardRef}>
              <MembershipCardPreview
                side="front"
                memberName={member.name}
                memberId={member.memberId}
                membershipType={member.membershipType}
                expiryDate={member.expiryDate}
                barcode={activeCard.barcode}
              />
            </div>
            <div ref={backCardRef}>
              <MembershipCardPreview
                side="back"
                memberName={member.name}
                memberId={member.memberId}
                membershipType={member.membershipType}
                expiryDate={member.expiryDate}
                barcode={activeCard.barcode}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {member.sessions?.length ? (
        <Card className="surface-panel rounded-xl border-0 shadow-none">
          <CardHeader>
            <CardTitle>{t("Recent session activity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.sessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{t("Session")} {session.sessionNumber ?? '–'}</p>
                    <p className="text-sm text-slate-600">
                      {session.memberPackage?.package.name || session.treatment?.name || t("Session record")}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDisplayDate(session.completedAt)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-500">{t("Status:")} {t(session.status)}</p>
                {session.processedByUser?.name && (
                  <p className="mt-1 text-sm text-slate-500">{t("Processed by")} {session.processedByUser.name}</p>
                )}
                {session.notes && (
                  <p className="mt-2 text-sm text-slate-500">{t("Notes:")} {session.notes}</p>
                )}
                {isSuperAdmin && session.status === 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-red-300 text-red-700"
                    onClick={() => setConfirmAction({ kind: 'undoSession', id: session.id, label: `${t("Session")} ${session.sessionNumber ?? ''} · ${session.memberPackage?.package.name || session.treatment?.name || ''}` })}
                  >
                    {t("Undo session")}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
