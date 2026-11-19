import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildCardShareUrl } from '@/lib/card-share';

export const dynamic = 'force-dynamic';

function requestOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '') || 'https';
  return `${protocol}://${host}`;
}

/** Returns the private card link for the member's current (active) card. Staff login required. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const card = await db.membershipCard.findFirst({
      where: { memberId: params.id, status: { in: ['ACTIVE', 'PRINTED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!card) return NextResponse.json({ error: 'Issue the membership card before sending it.' }, { status: 404 });
    return NextResponse.json({ url: buildCardShareUrl(card.id, requestOrigin(request)) });
  } catch (error) {
    console.error('Card share link error:', error);
    return NextResponse.json({ error: 'Could not create the card link' }, { status: 500 });
  }
}
