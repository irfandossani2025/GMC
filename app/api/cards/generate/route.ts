import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createOrGetActiveMembershipCard } from '@/lib/cards';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Check if member exists
    const member = await db.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const { card, existing } = await db.$transaction((tx) =>
      createOrGetActiveMembershipCard(tx, member)
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        existing: true,
        card,
      });
    }

    return NextResponse.json({
      success: true,
      existing: false,
      card: {
        id: card.id,
        cardNumber: card.cardNumber,
        barcode: card.barcode,
        memberId: card.memberId,
        issuedDate: card.issuedDate,
        expiryDate: card.expiryDate,
      },
    });
  } catch (error) {
    console.error('Card generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate card' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const cardId = searchParams.get('cardId');

    if (cardId) {
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

      return NextResponse.json(card);
    }

    if (memberId) {
      const cards = await db.membershipCard.findMany({
        where: { memberId },
        include: {
          member: {
            select: {
              id: true,
              memberId: true,
              name: true,
              phone: true,
              expiryDate: true,
              membershipType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(cards);
    }

    const cards = await db.membershipCard.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            name: true,
            phone: true,
            expiryDate: true,
            membershipType: true,
          },
        },
      },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Get card error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card' },
      { status: 500 }
    );
  }
}
