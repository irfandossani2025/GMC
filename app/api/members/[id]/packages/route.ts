import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { purchasePackageSchema } from '@/lib/validators';
import { generateTransactionId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const member = await db.member.findUnique({
      where: { id: params.id },
      include: {
        packages: {
          orderBy: { purchasedAt: 'desc' },
          include: {
            package: {
              include: {
                treatment: true,
              },
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

    return NextResponse.json({
      member: {
        id: member.id,
        memberId: member.memberId,
        name: member.name,
        phone: member.phone,
        email: member.email,
        membershipType: member.membershipType,
        status: member.status,
        expiryDate: member.expiryDate,
        packages: member.packages,
      },
    });
  } catch (error) {
    console.error('Member packages fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member package history' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = purchasePackageSchema.parse(body);

    const member = await db.member.findUnique({
      where: { id: params.id },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const treatmentPackage = await db.treatmentPackage.findUnique({
      where: { id: data.packageId },
      include: { treatment: true },
    });

    if (!treatmentPackage) {
      return NextResponse.json(
        { error: 'Treatment package not found' },
        { status: 404 }
      );
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + treatmentPackage.validityMonths);

    const memberPackage = await db.memberPackage.create({
      data: {
        memberId: member.id,
        packageId: treatmentPackage.id,
        purchasedAt: new Date(),
        expiryDate,
        totalSessions: treatmentPackage.sessionCount,
        usedSessions: 0,
        remainingSessions: treatmentPackage.sessionCount,
        status: 'ACTIVE',
      },
      include: {
        package: {
          include: { treatment: true },
        },
      },
    });

    await db.transaction.create({
      data: {
        transactionId: generateTransactionId(),
        memberId: member.id,
        amount: treatmentPackage.price,
        type: 'MEMBERSHIP_FEE',
        status: 'COMPLETED',
        description: `Purchased ${treatmentPackage.name} package`,
      },
    });

    return NextResponse.json(memberPackage, { status: 201 });
  } catch (error) {
    console.error('Purchase package error:', error);
    return NextResponse.json(
      { error: 'Failed to purchase package' },
      { status: 400 }
    );
  }
}

