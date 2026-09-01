import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractBarcodeToken } from '@/lib/card-utils';

export const dynamic = 'force-dynamic';

function getRequestOrigin(request: NextRequest): string {
  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || request.nextUrl.host;
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(':', '') || 'https';

  return `${protocol}://${host}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { barcode: string } }
) {
  const barcode = extractBarcodeToken(params.barcode);
  const origin = getRequestOrigin(request);
  const redirectUrl = new URL('/dashboard/scan', origin);
  redirectUrl.searchParams.set('barcode', barcode);

  if (!barcode) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const card = await db.membershipCard.findUnique({
      where: { barcode },
      select: {
        memberId: true,
      },
    });

    if (!card) {
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.redirect(new URL(`/dashboard/members/${card.memberId}`, origin));
  } catch (error) {
    console.error('Card scan redirect error:', error);
    return NextResponse.redirect(redirectUrl);
  }
}
