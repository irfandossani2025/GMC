import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const isAdministrator = (role: string) => role === 'ADMIN' || role === 'SUPER_ADMIN';
export const canManageUser = (actor: { id: string; role: string }, target: { id: string; role: string }) =>
  actor.role === 'SUPER_ADMIN' || (actor.role === 'ADMIN' && target.role === 'STAFF');

export async function currentUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  return user?.active ? user : null;
}

/**
 * Allows the request only for an active Super Admin.
 * Returns { user } on success, or { response } with a 401/403 to send back.
 */
export async function requireSuperAdmin(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  if (user.role !== 'SUPER_ADMIN') {
    return { response: NextResponse.json({ error: 'Only the Super Admin can make this change.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}

/** Best-effort audit trail entry; never blocks the main action. */
export async function recordAudit(entry: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  memberId?: string | null;
  changes?: unknown;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        memberId: entry.memberId ?? null,
        changes: entry.changes === undefined ? null : JSON.stringify(entry.changes),
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
