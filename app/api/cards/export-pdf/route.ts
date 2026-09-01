import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId } = body;

    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    const card = await db.membershipCard.findUnique({
      where: { id: cardId },
      include: {
        member: true,
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // In production, you would generate the actual PDF here
    // For now, returning a response indicating PDF generation was initiated
    
    return NextResponse.json({
      success: true,
      message: 'Card data ready for client-side PDF export',
      card: {
        id: card.id,
        cardNumber: card.cardNumber,
        barcode: card.barcode,
        expiryDate: card.expiryDate,
      },
      member: {
        name: card.member?.name,
        memberId: card.member?.memberId,
        membershipType: card.member?.membershipType,
      },
      printDimensions: {
        widthMm: 85.6,
        heightMm: 54,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF' },
      { status: 500 }
    );
  }
}
