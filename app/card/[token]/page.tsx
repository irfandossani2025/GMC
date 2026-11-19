import { db } from '@/lib/db';
import { verifyCardShareToken } from '@/lib/card-share';
import { CardShareView } from '@/components/cards/CardShareView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Grand Medical Care - Membership Card', robots: { index: false, follow: false } };

/** Public page opened from the WhatsApp link: shows the member's own card to view and save. */
export default async function SharedCardPage({ params }: { params: { token: string } }) {
  let cardId: string | null = null;
  try {
    cardId = verifyCardShareToken(params.token);
  } catch {
    cardId = null;
  }
  const card = cardId
    ? await db.membershipCard.findUnique({
        where: { id: cardId },
        include: { member: { select: { name: true, memberId: true, membershipType: true, expiryDate: true, status: true } } },
      })
    : null;
  const valid = card && ['ACTIVE', 'PRINTED'].includes(card.status) && card.member && card.member.status !== 'INACTIVE';

  if (!valid) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">This card link is no longer valid</h1>
        <p className="mt-3 text-slate-600">Please contact Grand Medical Care reception for your current membership card.</p>
      </main>
    );
  }

  return (
    <CardShareView
      memberName={card.member.name}
      memberId={card.member.memberId}
      membershipType={card.member.membershipType}
      expiryDate={card.member.expiryDate.toISOString()}
      barcode={card.barcode}
    />
  );
}
