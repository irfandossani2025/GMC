import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordAudit, requireSuperAdmin } from '@/lib/security/user-access';

export const dynamic = 'force-dynamic';

/**
 * Super Admin: undo a session recorded by mistake.
 * The session is marked CANCELLED (kept for history) and the session is
 * given back to the patient's package.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    const session = await db.session.findUnique({ where: { id: params.id }, include: { memberPackage: true } });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Only a completed session can be undone.' }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const cancelled = await tx.session.update({
        where: { id: session.id },
        data: {
          status: 'CANCELLED',
          notes: [session.notes, `Undone by ${access.user.name || 'Super Admin'} on ${new Date().toISOString().slice(0, 10)}`]
            .filter(Boolean)
            .join(' · '),
        },
      });

      let memberPackage = null;
      if (session.memberPackage) {
        const pkg = session.memberPackage;
        memberPackage = await tx.memberPackage.update({
          where: { id: pkg.id },
          data: {
            usedSessions: Math.max(0, pkg.usedSessions - 1),
            remainingSessions: pkg.remainingSessions + 1,
            status: pkg.status === 'COMPLETED' ? 'ACTIVE' : pkg.status,
          },
        });
      }
      return { session: cancelled, memberPackage };
    });

    await recordAudit({
      userId: access.user.id,
      action: 'UNDO_SESSION',
      entityType: 'Session',
      entityId: session.id,
      memberId: session.memberId,
      changes: { packageId: session.packageId },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Undo session error:', error);
    return NextResponse.json({ error: 'Failed to undo session' }, { status: 500 });
  }
}
