import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateMemberPackageSchema } from '@/lib/validators';
import { recordAudit, requireSuperAdmin } from '@/lib/security/user-access';

export const dynamic = 'force-dynamic';

/** Super Admin: change remaining sessions, expiry date or status of a patient's package. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    const data = updateMemberPackageSchema.parse(await request.json());
    const current = await db.memberPackage.findUnique({ where: { id: params.id } });
    if (!current) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

    const remaining = data.remainingSessions ?? current.remainingSessions;
    let status = data.status ?? current.status;
    // Keep status consistent with the balance unless the Super Admin chose cancel/expire.
    if (!data.status) {
      if (remaining > 0 && status === 'COMPLETED') status = 'ACTIVE';
      if (remaining === 0 && status === 'ACTIVE') status = 'COMPLETED';
    }

    const updated = await db.memberPackage.update({
      where: { id: current.id },
      data: {
        remainingSessions: remaining,
        totalSessions: current.usedSessions + remaining,
        ...(data.expiryDate ? { expiryDate: data.expiryDate } : {}),
        status,
      },
    });

    await recordAudit({
      userId: access.user.id,
      action: 'UPDATE',
      entityType: 'MemberPackage',
      entityId: current.id,
      memberId: current.memberId,
      changes: {
        remainingSessions: { from: current.remainingSessions, to: updated.remainingSessions },
        expiryDate: { from: current.expiryDate, to: updated.expiryDate },
        status: { from: current.status, to: updated.status },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if ((error as { name?: string }).name === 'ZodError') {
      const issue = (error as { issues?: Array<{ message?: string }> }).issues?.[0];
      return NextResponse.json({ error: issue?.message || 'Please check the package details.' }, { status: 400 });
    }
    console.error('Update member package error:', error);
    return NextResponse.json({ error: 'Failed to update package' }, { status: 400 });
  }
}

/** Super Admin: cancel a patient's package (kept for history, no longer usable). */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    const current = await db.memberPackage.findUnique({ where: { id: params.id } });
    if (!current) return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    const updated = await db.memberPackage.update({ where: { id: current.id }, data: { status: 'CANCELLED' } });
    await recordAudit({ userId: access.user.id, action: 'CANCEL', entityType: 'MemberPackage', entityId: current.id, memberId: current.memberId });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Cancel member package error:', error);
    return NextResponse.json({ error: 'Failed to cancel package' }, { status: 500 });
  }
}
