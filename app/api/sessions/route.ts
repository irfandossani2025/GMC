import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendSessionConfirmation } from '@/lib/whatsapp-cloud/notify';
import { processSessionSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = processSessionSchema.parse(body);

    let member = null;
    let card = null;

    if (data.barcode) {
      card = await db.membershipCard.findUnique({
        where: { barcode: data.barcode },
        include: { member: true },
      });

      if (!card || !card.member) {
        return NextResponse.json(
          { error: 'Membership card not found' },
          { status: 404 }
        );
      }
      if (!['ACTIVE', 'PRINTED'].includes(card.status)) {
        return NextResponse.json(
          { error: 'This membership card has been deactivated. Please use the patient ID or the new card.' },
          { status: 410 }
        );
      }

      member = card.member;
    } else if (data.memberId) {
      member = await db.member.findUnique({
        where: { memberId: data.memberId },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        );
      }
    }

    if (member && member.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'This patient has been deactivated. Ask the Super Admin to reactivate them before recording a session.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const activePackages = await db.memberPackage.findMany({
      where: {
        memberId: member!.id,
        status: 'ACTIVE',
        expiryDate: { gte: now },
        remainingSessions: { gt: 0 },
      },
      include: {
        package: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    if (activePackages.length === 0) {
      return NextResponse.json(
        {
          error:
            'No active package with remaining sessions found. Please assign a new treatment package before processing a session.',
        },
        { status: 400 }
      );
    }

    const selectedPackage = data.packageId
      ? activePackages.find((pkg) => pkg.id === data.packageId)
      : activePackages[0];

    if (!selectedPackage) {
      return NextResponse.json(
        {
          error:
            'The selected package is not available or has no remaining sessions.',
        },
        { status: 400 }
      );
    }

    const nextRemaining = selectedPackage.remainingSessions - 1;

    // Both steps succeed together or not at all, so a failed save can never
    // use up a session without a session record.
    const { updatedPackage, session } = await db.$transaction(async (tx) => {
      const updatedPackage = await tx.memberPackage.update({
        where: { id: selectedPackage.id },
        data: {
          usedSessions: { increment: 1 },
          remainingSessions: { decrement: 1 },
          status:
            nextRemaining <= 0 ? 'COMPLETED' : selectedPackage.status,
        },
        include: {
          package: { include: { treatment: true } },
        },
      });

      const session = await tx.session.create({
        data: {
          memberId: member!.id,
          // The treatment this package belongs to (not the package's own id).
          treatmentId: updatedPackage.package.treatmentId,
          packageId: selectedPackage.id,
          sessionNumber: selectedPackage.usedSessions + 1,
          status: 'COMPLETED',
          completedAt: new Date(),
          processedByUserId: userId,
          notes: data.notes,
        },
      });

      return { updatedPackage, session };
    });

    // Session confirmation from the clinic WhatsApp number (Meta WhatsApp API).
    // A WhatsApp problem never undoes the recorded session.
    let whatsapp;
    try {
      whatsapp = await sendSessionConfirmation({
        memberId: member!.id,
        phone: member!.phone,
        name: member!.name,
        treatment: updatedPackage.package.treatment?.name && updatedPackage.package.treatment.name !== updatedPackage.package.name
          ? `${updatedPackage.package.treatment.name} (${updatedPackage.package.name})`
          : updatedPackage.package.name,
        usedSessions: updatedPackage.usedSessions,
        totalSessions: updatedPackage.totalSessions,
        remainingSessions: updatedPackage.remainingSessions,
        sessionId: session.id,
      });
    } catch (error) {
      console.error('Session WhatsApp error:', error);
      whatsapp = { status: 'failed' as const, error: 'WhatsApp message could not be sent.' };
    }

    return NextResponse.json({
      session,
      memberPackage: updatedPackage,
      whatsapp,
    });
} catch (error) {
    console.error('Session processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process session' },
      { status: 400 }
    );
  }
}

