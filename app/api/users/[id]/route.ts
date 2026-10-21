import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { currentUser, isAdministrator, canManageUser } from '@/lib/security/user-access';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const schema = z.object({ name: z.string().trim().min(2).optional(), email: z.string().trim().email().optional(), password: z.string().min(8).optional(), role: z.enum(['ADMIN', 'STAFF']).optional(), active: z.boolean().optional() });
async function update(request: NextRequest, id: string, deactivate = false) {
  try {
    const actor = await currentUser(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdministrator(actor.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const data = deactivate ? { active: false } : schema.parse(await request.json());
    const password = data.password !== undefined ? await hashPassword(data.password) : undefined;
    const result = await db.$transaction(async tx => {
      // Serialize role changes with initial Super Admin provisioning.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7231042)`;
      const target = await tx.user.findUnique({ where: { id } });
      if (!target) return { error: 'User not found', status: 404 };
      if (!canManageUser(actor, target)) return { error: 'Only a Super Admin can manage administrators', status: 403 };
      if (target.role === 'SUPER_ADMIN' && (data.role !== undefined || data.active === false)) return { error: 'The Super Admin account cannot be demoted or deactivated here', status: 403 };
      if (data.role === 'ADMIN' && actor.role !== 'SUPER_ADMIN') return { error: 'Only a Super Admin can grant Admin access', status: 403 };
      if (id === actor.id && (data.active === false || (data.role !== undefined && data.role !== actor.role))) return { error: 'You cannot remove your own access', status: 400 };
      const user = await tx.user.update({ where: { id }, data: { ...data, ...(password !== undefined ? { password } : {}) }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true } });
      await tx.auditLog.create({ data: { action: 'UPDATE', entityType: 'User', entityId: id, userId: actor.id, changes: JSON.stringify({ role: { from: target.role, to: user.role }, active: user.active, passwordChanged: password !== undefined }) } });
      return { user };
    });
    return 'error' in result ? NextResponse.json({ error: result.error }, { status: result.status }) : NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Email address already in use' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) { return update(request, params.id); }
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) { return update(request, params.id, true); }
