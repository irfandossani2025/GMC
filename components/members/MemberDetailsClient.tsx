'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MembershipCardPreview } from '@/components/cards/MembershipCardPreview';
import { getJson, postJson } from '@/lib/api-client';
import { downloadCardPDF } from '@/lib/pdf';
import { buildCardIssuedMessage, buildWelcomeMessage, buildWhatsAppLink } from '@/lib/whatsapp';
import { formatDisplayDate, formatMembershipType } from '@/lib/clinic';

interface MemberDetailsClientProps {
  memberId: string;
}

interface MembershipCardRecord {
  id: string;
  cardNumber: string;
  barcode: string;
  expiryDate: string;
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
  cards: MembershipCardRecord[];
  packages?: MemberPackageRecord[];
  sessions?: SessionHistoryRecord[];
  createdByUser?: {
    name: string;
    email: string;
  };
}

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
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [availablePackages, setAvailablePackages] = useState<TreatmentPackageResponse[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isIssuingCard, setIsIssuingCard] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPurchasingPackage, setIsPurchasingPackage] = useState(false);
  const [packageMessage, setPackageMessage] = useState<string>('');

  const frontCardRef = useRef<HTMLDivElement | null>(null);
  const backCardRef = useRef<HTMLDivElement | null>(null);

  const activeCard = useMemo(() => member?.cards?.[0] || null, [member]);
  const activePackages = useMemo(
    () => member?.packages?.filter((pkg) => pkg.status === 'ACTIVE' && pkg.remainingSessions > 0) ?? [],
    [member]
  );

  const fetchMember = async () => {
    try {
      setIsLoading(true);
      const response = await getJson<MemberResponse>(`/api/members/${memberId}`);
      setMember(response);
    } catch (error) {
      console.error('Failed to fetch member details:', error);
      setMember(null);
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
    if (availablePackages.length && !selectedPackageId) {
      setSelectedPackageId(availablePackages[0].id);
    }
  }, [availablePackages, selectedPackageId]);

  const handleIssueCard = async () => {
    if (!member) {
      return;
    }

    try {
      setIsIssuingCard(true);
      await postJson('/api/cards/generate', { memberId: member.id });
      await fetchMember();
    } catch (error) {
      console.error('Failed to issue membership card:', error);
    } finally {
      setIsIssuingCard(false);
    }
  };

  const handleExportPdf = async () => {
    if (!frontCardRef.current || !member || !activeCard) {
      return;
    }

    try {
      setIsExportingPdf(true);
      await downloadCardPDF(
        frontCardRef.current,
        backCardRef.current || undefined,
        `${member.memberId}-membership-card.pdf`
      );
    } catch (error) {
      console.error('Failed to export PDF:', error);
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
    return <div className="py-16 text-center text-slate-500">Loading member details...</div>;
  }

  if (!member) {
    return (
      <Card className="surface-panel rounded-[1.75rem] border-0 shadow-none">
        <CardContent className="py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">Patient not found</p>
          <Link href="/dashboard/members" className="mt-4 inline-block text-primary">
            Return to members list
          </Link>
        </CardContent>
      </Card>
    );
  }

  const welcomeMessage = buildWelcomeMessage(member.name, member.memberId, member.expiryDate);
  const cardMessage = buildCardIssuedMessage(member.name, member.memberId, member.expiryDate);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/members" className="text-sm font-medium text-primary">
            Back to patients
          </Link>
          <h1 className="page-title mt-3">{member.name}</h1>
          <p className="page-subtitle mt-3">
            Grand Medical Care patient profile, package session balance, and printable membership card details.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl border-primary text-primary" onClick={() => openWhatsApp(welcomeMessage)}>
            WhatsApp Welcome
          </Button>
          <Button variant="outline" className="rounded-2xl border-primary text-primary" onClick={() => openWhatsApp(cardMessage)}>
            WhatsApp Card Ready
          </Button>
          <Button
            variant="primary"
            className="rounded-2xl bg-primary hover:bg-primary/90"
            isLoading={isIssuingCard}
            onClick={handleIssueCard}
          >
            {activeCard ? 'Recheck Existing Card' : 'Issue Membership Card'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="surface-panel rounded-[1.75rem] border-0 shadow-none">
          <CardHeader>
            <CardTitle>Patient profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Member No.</p>
              <p className="mt-1 font-semibold text-slate-900">{member.memberId}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Membership Type</p>
              <p className="mt-1 font-semibold text-slate-900">{formatMembershipType(member.membershipType)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Phone</p>
              <p className="mt-1 font-semibold text-slate-900">{member.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Patient ID</p>
              <p className="mt-1 font-semibold text-slate-900">{member.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Status</p>
              <p className="mt-1 font-semibold text-slate-900">{member.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Expiry Date</p>
              <p className="mt-1 font-semibold text-slate-900">{formatDisplayDate(member.expiryDate)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Address</p>
              <p className="mt-1 font-semibold text-slate-900">{member.address || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel rounded-[1.75rem] border-0 shadow-none">
          <CardHeader>
            <CardTitle>Card status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current state</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {activeCard ? 'Membership card issued' : 'Waiting for first card issuance'}
              </p>
            </div>
            {activeCard ? (
              <div className="space-y-2 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-900">Card Number:</span> {activeCard.cardNumber}</p>
                <p><span className="font-semibold text-slate-900">Barcode:</span> {activeCard.barcode}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Use the issue button to create the first Grand Medical Care PVC card and barcode for this member.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="surface-panel rounded-[1.75rem] border-0 shadow-none">
          <CardHeader>
            <CardTitle>Package balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.packages?.length ? (
              <div className="space-y-4">
                {activePackages.length === 0 ? (
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    No active package balance is available. Add a new package to give this member sessions.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {activePackages.map((pkg) => (
                      <div key={pkg.id} className="rounded-3xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-900">{pkg.package.name}</p>
                        <p className="text-sm text-slate-500">{pkg.package.treatment.name}</p>
                        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1">{pkg.remainingSessions} left</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">Used {pkg.usedSessions}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">Expires {formatDisplayDate(pkg.expiryDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No packages have been purchased for this member yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel rounded-[1.75rem] border-0 shadow-none">
          <CardHeader>
            <CardTitle>Purchase package</CardTitle>
          </CardHeader>
          <CardContent>
            {packageMessage && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {packageMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Choose package</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedPackageId}
                  onChange={(event) => setSelectedPackageId(event.target.value)}
                >
                  {availablePackages.length === 0 ? (
                    <option value="">No service packages configured</option>
                  ) : (
                    availablePackages.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} • {option.treatment.name} • {option.sessionCount} sessions
                      </option>
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
                Add session package
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeCard && (
        <Card className="surface-panel rounded-[1.75rem] border-0 shadow-none">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-200/80 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Printable membership card</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                Front and back PVC card layout sized for professional printing.
              </p>
            </div>
            <Button
              variant="primary"
              className="rounded-2xl bg-primary hover:bg-primary/90"
              isLoading={isExportingPdf}
              onClick={handleExportPdf}
            >
              Export PDF
            </Button>
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
        <Card className="surface-panel rounded-[1.75rem] border-0 shadow-none">
          <CardHeader>
            <CardTitle>Recent session activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.sessions.map((session) => (
              <div key={session.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Session {session.sessionNumber ?? '–'}</p>
                    <p className="text-sm text-slate-600">
                      {session.memberPackage?.package.name || session.treatment?.name || 'Session record'}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDisplayDate(session.completedAt)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-500">Status: {session.status}</p>
                {session.processedByUser?.name && (
                  <p className="mt-1 text-sm text-slate-500">Processed by {session.processedByUser.name}</p>
                )}
                {session.notes && (
                  <p className="mt-2 text-sm text-slate-500">Notes: {session.notes}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
