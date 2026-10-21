import { NextRequest } from 'next/server';
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
