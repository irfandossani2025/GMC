import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractBarcodeToken } from '@/lib/card-utils';

export const dynamic = 'force-dynamic';

function mapPackage(pkg: any) {
  return {
    id: pkg.id,
    name: pkg.package?.name || 'Package',
    treatmentName: pkg.package?.treatment?.name || 'Treatment',
    sessionCount: pkg.totalSessions,
    usedSessions: pkg.usedSessions,
    remainingSessions: pkg.remainingSessions,
    expiryDate: pkg.expiryDate,
    status: pkg.status,
  };
}

function mapSession(session: any) {
  return {
    id: session.id,
    sessionNumber: session.sessionNumber,
    status: session.status,
    completedAt: session.completedAt,
    notes: session.notes,
    packageName: session.memberPackage?.package?.name || session.memberPackage?.name || 'Session',
    treatmentName: session.treatment?.name,
    processedBy: session.processedByUser?.name,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barcodeInput = searchParams.get('barcode')?.trim();
    const barcode = barcodeInput ? extractBarcodeToken(barcodeInput) : undefined;
    const memberId = searchParams.get('memberId')?.trim();

    if (!barcode && !memberId) {
      return NextResponse.json(
        { error: 'Barcode or member ID is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    let member: any = null;
    let card: any = null;

    if (barcode) {
      card = await db.membershipCard.findUnique({
        where: { barcode },
        include: {
          member: {
            include: {
              cards: {
                orderBy: { createdAt: 'desc' },
              },
              packages: {
                orderBy: { purchasedAt: 'desc' },
                include: {
                  package: {
                    include: { treatment: true },
                  },
                },
              },
              sessions: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                  treatment: true,
                  memberPackage: {
                    include: { package: true },
                  },
                  processedByUser: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!card || !card.member) {
        return NextResponse.json(
          { error: 'Card not found' },
          { status: 404 }
        );
      }

      member = card.member;
    } else {
      member = await db.member.findUnique({
        where: { memberId },
        include: {
          cards: {
            orderBy: { createdAt: 'desc' },
          },
          packages: {
            orderBy: { purchasedAt: 'desc' },
            include: {
              package: {
                include: { treatment: true },
              },
            },
          },
          sessions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              treatment: true,
              memberPackage: {
                include: { package: true },
              },
              processedByUser: {
                select: { name: true },
              },
            },
          },
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        );
      }

      card = member.cards?.[0] || null;
    }

    const activePackages = (member.packages || [])
      .filter(
        (pkg: any) =>
          pkg.status === 'ACTIVE' &&
          pkg.remainingSessions > 0 &&
          new Date(pkg.expiryDate) >= now
      )
      .map(mapPackage);

    const result = {
      member: {
        id: member.id,
        memberId: member.memberId,
        name: member.name,
        phone: member.phone,
        email: member.email,
        membershipType: member.membershipType,
        status: member.status,
        expiryDate: member.expiryDate,
      },
      card: card
        ? {
            id: card.id,
            cardNumber: card.cardNumber,
            barcode: card.barcode,
            issuedDate: card.issuedDate,
            expiryDate: card.expiryDate,
          }
        : null,
      activePackages,
      totalRemainingSessions: activePackages.reduce(
        (sum: number, pkg: any) => sum + pkg.remainingSessions,
        0
      ),
      recentSessions: (member.sessions || []).map(mapSession),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Scan lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to search barcode or member' },
      { status: 500 }
    );
  }
}
