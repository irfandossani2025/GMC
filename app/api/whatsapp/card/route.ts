import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { buildCardShareUrl } from '@/lib/card-share';
import { loadActiveWhatsAppConfig } from '@/lib/whatsapp-cloud/settings';
import { latestCardMessage, sendMembershipCard } from '@/lib/whatsapp-cloud/notify';

export const dynamic = 'force-dynamic';

function requestOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
}

const AUTO_SEND_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Auto-send only for cards issued after WhatsApp was switched on, within 24 hours. */
function autoEligible(card: { createdAt: Date } | null, enabledAt?: string): boolean {
  if (!card || !enabledAt) return false;
  const issued = card.createdAt.getTime();
  return issued >= new Date(enabledAt).getTime() && Date.now() - issued <= AUTO_SEND_WINDOW_MS;
}

async function activeCard(memberId: string) {
  return db.membershipCard.findFirst({
    where: { memberId, status: { in: ['ACTIVE', 'PRINTED'] } },
    orderBy: { createdAt: 'desc' },
    include: { member: true },
  });
}

/** Card WhatsApp status for the patient page (and whether to auto-send). */
export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('memberId');
  if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  const [{ config, reason }, card] = await Promise.all([loadActiveWhatsAppConfig(), activeCard(memberId)]);
  const history = card ? await latestCardMessage(card.id) : null;
  return NextResponse.json({
    configured: !!config,
    reason: config ? null : reason,
    autoSend: !!config?.sendCardOnIssue && autoEligible(card, config?.enabledAt) && !history?.lastAttemptAt,
    cardId: card?.id || null,
    ...(history || { sentAt: null, lastAttemptAt: null, lastStatus: null, lastError: null }),
  });
}

const schema = z.object({
  memberId: z.string().min(1),
  cardId: z.string().min(1),
  image: z.string().min(100).max(8_000_000),
  automatic: z.boolean().default(false),
});

/** Sends the member's card (picture made in the browser + private link) from the clinic WhatsApp number. */
export async function POST(request: NextRequest) {
  try {
    const { memberId, cardId, image, automatic } = schema.parse(await request.json());
    const card = await activeCard(memberId);
    if (!card || card.id !== cardId) return NextResponse.json({ error: 'This card is no longer active. Reload the page.' }, { status: 409 });
    if (card.member.status === 'INACTIVE') return NextResponse.json({ error: 'This patient is deactivated.' }, { status: 400 });

    if (automatic) {
      const { config } = await loadActiveWhatsAppConfig();
      const history = await latestCardMessage(card.id);
      if (!autoEligible(card, config?.enabledAt) || history.sentAt || history.lastAttemptAt) {
        return NextResponse.json({ status: 'skipped', ...history });
      }
    }

    const png = Buffer.from(image.replace(/^data:image\/png;base64,/, ''), 'base64');
    if (png.length > 5 * 1024 * 1024 || png.subarray(1, 4).toString() !== 'PNG') {
      return NextResponse.json({ error: 'The card picture is not a valid PNG under 5 MB.' }, { status: 400 });
    }

    const outcome = await sendMembershipCard({
      memberId,
      cardId: card.id,
      phone: card.member.phone,
      name: card.member.name,
      patientId: card.member.memberId,
      expiryDate: card.member.expiryDate,
      cardUrl: buildCardShareUrl(card.id, requestOrigin(request)),
      image: png,
      automatic,
    });
    const history = await latestCardMessage(card.id);
    return NextResponse.json({ ...outcome, ...history });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'The card could not be prepared for WhatsApp.' }, { status: 400 });
    console.error('WhatsApp card send error:', error);
    return NextResponse.json({ error: 'WhatsApp card could not be sent.' }, { status: 500 });
  }
}
