import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildSessionUsedMessage, buildWhatsAppLink, sendWhatsAppMessage } from '@/lib/whatsapp';
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
    const updatedPackage = await db.memberPackage.update({
      where: { id: selectedPackage.id },
      data: {
        usedSessions: { increment: 1 },
        remainingSessions: { decrement: 1 },
        status:
          nextRemaining <= 0 ? 'COMPLETED' : selectedPackage.status,
      },
      include: {
        package: true,
      },
    });

    const session = await db.session.create({
      data: {
        memberId: member.id,
        treatmentId: selectedPackage.packageId,
        packageId: selectedPackage.id,
        sessionNumber: selectedPackage.usedSessions + 1,
        status: 'COMPLETED',
        completedAt: new Date(),
        processedByUserId: userId,
        notes: data.notes,
      },
    });

    const message = buildSessionUsedMessage(
      member.name,
      updatedPackage.package.name,
      updatedPackage.remainingSessions
    );

    // Send WhatsApp notification (auto-send if API credentials configured, fallback to link)
    const whatsappResult = await sendWhatsAppMessage(member.phone, message);

    await db.whatsAppLog.create({
	      data: {
		          phone: member.phone,
		          message,
		          messageType: 'SESSION_USED',
		          status: whatsappResult.success ? 'sent' : 'pending',
		  },
	});

    return NextResponse.json({
	      session,
	      memberPackage: updatedPackage,
	      whatsappSent: whatsappResult.success,
	      whatsappMethod: whatsappResult.method,
	      whatsappLink: whatsappResult.link ?? null,
	});
} catch (error) {
    console.error('Session processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process session' },
      { status: 400 }
    );
  }
}

