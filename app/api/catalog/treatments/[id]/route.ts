import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateTreatmentSchema } from '@/lib/validators';
import { recordAudit, requireSuperAdmin } from '@/lib/security/user-access';

export const dynamic = 'force-dynamic';

/** Super Admin: edit a treatment in the catalog. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    const data = updateTreatmentSchema.parse(await request.json());
    const treatment = await db.treatment.update({ where: { id: params.id }, data });
    await recordAudit({ userId: access.user.id, action: 'UPDATE', entityType: 'Treatment', entityId: treatment.id, changes: data });
    return NextResponse.json(treatment);
  } catch (error) {
    if ((error as { name?: string }).name === 'ZodError') {
      const issue = (error as { issues?: Array<{ message?: string }> }).issues?.[0];
      return NextResponse.json({ error: issue?.message || 'Please check the treatment details.' }, { status: 400 });
    }
    console.error('Update treatment error:', error);
    return NextResponse.json({ error: 'Failed to update treatment' }, { status: 400 });
  }
}

/**
 * Super Admin: remove a treatment from the catalog (and its packages).
 * Patients who already bought these packages keep their balances.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    await db.$transaction([
      db.treatmentPackage.updateMany({ where: { treatmentId: params.id }, data: { active: false } }),
      db.treatment.update({ where: { id: params.id }, data: { active: false } }),
    ]);
    await recordAudit({ userId: access.user.id, action: 'REMOVE', entityType: 'Treatment', entityId: params.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove treatment error:', error);
    return NextResponse.json({ error: 'Failed to remove treatment' }, { status: 500 });
  }
}
