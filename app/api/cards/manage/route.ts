import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createOrGetActiveMembershipCard } from '@/lib/cards';
import { recordAudit, requireSuperAdmin } from '@/lib/security/user-access';

export const dynamic = 'force-dynamic';

const schema = z.object({
  memberId: z.string().min(1),
  action: z.enum(['deactivate', 'reissue']),
});

/**
 * Super Admin card management for a patient.
 * - deactivate: the current card stops working at reception (scan / card number).
 * - reissue: the current card is deactivated and a new card with a new number and barcode is created.
 */
export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    const { memberId, action } = schema.parse(await request.json());
    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const result = await db.$transaction(async (tx) => {
      const deactivated = await tx.membershipCard.updateMany({
        where: { memberId, status: { in: ['ACTIVE', 'PRINTED'] } },
        data: { status: 'INACTIVE' },
      });
      if (action === 'deactivate') {
        await tx.member.update({ where: { id: memberId }, data: { cardIssued: false } });
        return { deactivated: deactivated.count, card: null };
      }
      const { card } = await createOrGetActiveMembershipCard(tx, member);
      return { deactivated: deactivated.count, card };
    });

    await recordAudit({
      userId: access.user.id,
      action: action === 'reissue' ? 'CARD_REISSUED' : 'CARD_DEACTIVATED',
      entityType: 'MembershipCard',
      entityId: result.card?.id || memberId,
      memberId,
      changes: { deactivatedCards: result.deactivated },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Card management error:', error);
    return NextResponse.json({ error: 'Failed to update the membership card' }, { status: 400 });
  }
}
