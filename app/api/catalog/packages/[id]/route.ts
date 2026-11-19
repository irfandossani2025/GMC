import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateCatalogPackageSchema } from '@/lib/validators';
import { recordAudit, requireSuperAdmin } from '@/lib/security/user-access';

export const dynamic = 'force-dynamic';

/**
 * Super Admin: edit a package in the catalog.
 * Changes apply to future sales only; packages patients already bought are unchanged.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    const data = updateCatalogPackageSchema.parse(await request.json());
    const pkg = await db.treatmentPackage.update({ where: { id: params.id }, data, include: { treatment: true } });
    await recordAudit({ userId: access.user.id, action: 'UPDATE', entityType: 'TreatmentPackage', entityId: pkg.id, changes: data });
    return NextResponse.json(pkg);
  } catch (error) {
    if ((error as { name?: string }).name === 'ZodError') {
      const issue = (error as { issues?: Array<{ message?: string }> }).issues?.[0];
      return NextResponse.json({ error: issue?.message || 'Please check the package details.' }, { status: 400 });
    }
    console.error('Update catalog package error:', error);
    return NextResponse.json({ error: 'Failed to update package' }, { status: 400 });
  }
}

/** Super Admin: remove a package from sale. Existing patient balances are kept. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    await db.treatmentPackage.update({ where: { id: params.id }, data: { active: false } });
    await recordAudit({ userId: access.user.id, action: 'REMOVE', entityType: 'TreatmentPackage', entityId: params.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove catalog package error:', error);
    return NextResponse.json({ error: 'Failed to remove package' }, { status: 500 });
  }
}
