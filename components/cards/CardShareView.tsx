'use client';

import { useRef, useState } from 'react';
import { MembershipCardPreview } from '@/components/cards/MembershipCardPreview';
import { renderCardImage } from '@/lib/pdf';

interface CardShareViewProps {
  memberName: string;
  memberId: string;
  membershipType: string;
  expiryDate: string;
  barcode: string;
}

export function CardShareView(props: CardShareViewProps) {
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveImage = async () => {
    if (!frontRef.current) return;
    setSaving(true);
    setError('');
    try {
      const blob = await renderCardImage(frontRef.current, backRef.current || undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${props.memberId}-membership-card.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not save the image. You can take a screenshot of the card instead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Your Membership Card</h1>
        <p className="mt-2 text-slate-600">Show this card at Grand Medical Care reception on every visit.</p>
      </div>
      <div ref={frontRef}><MembershipCardPreview side="front" {...props} /></div>
      <div ref={backRef}><MembershipCardPreview side="back" {...props} /></div>
      <div className="text-center">
        <button
          type="button"
          onClick={saveImage}
          disabled={saving}
          className="rounded-lg bg-[#0B1F3A] px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Preparing…' : 'Save card to my phone'}
        </button>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}
