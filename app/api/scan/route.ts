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
    // Manual entry: one box that accepts a card number, barcode or patient ID.
    const query = searchParams.get('q')?.trim();

    if (!barcode && !memberId && !query) {
      return NextResponse.json(
        { error: 'Barcode or member ID is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    let member: any = null;
    let card: any = null;

    if (query) {
      const token = extractBarcodeToken(query);
      const memberInclude = {
        cards: { orderBy: { createdAt: 'desc' as const } },
        packages: {
          orderBy: { purchasedAt: 'desc' as const },
          include: { package: { include: { treatment: true } } },
        },
        sessions: {
          orderBy: { createdAt: 'desc' as const },
          take: 10,
          include: {
            treatment: true,
            memberPackage: { include: { package: true } },
            processedByUser: { select: { name: true } },
          },
        },
      };

      // 1) card barcode, 2) printed card number, 3) patient ID
      card =
        (token && (await db.membershipCard.findUnique({ where: { barcode: token }, include: { member: { include: memberInclude } } }))) ||
        (await db.membershipCard.findUnique({ where: { cardNumber: query.toUpperCase() }, include: { member: { include: memberInclude } } })) ||
        (await db.membershipCard.findUnique({ where: { cardNumber: query }, include: { member: { include: memberInclude } } }));

      if (card?.member) {
        member = card.member;
      } else {
        card = null;
        member =
          (await db.member.findUnique({ where: { memberId: query }, include: memberInclude })) ||
          (await db.member.findUnique({ where: { memberId: query.toUpperCase() }, include: memberInclude }));

        if (!member) {
          return NextResponse.json(
            { error: 'No member found with this card number or patient ID.' },
            { status: 404 }
          );
        }
        card = member.cards?.[0] || null;
      }
    } else if (barcode) {
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
