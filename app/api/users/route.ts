import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { currentUser, isAdministrator } from '@/lib/security/user-access';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const schema = z.object({ name: z.string().trim().min(2), email: z.string().trim().email(), password: z.string().min(8), role: z.enum(['ADMIN', 'STAFF']).default('STAFF') });
export async function GET(request: NextRequest) {
  try {
    const actor = await currentUser(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdministrator(actor.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true, _count: { select: { sessions: true } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ users, currentUser: actor });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdministrator(actor.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const data = schema.parse(await request.json());
    if (data.role === 'ADMIN' && actor.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Only a Super Admin can create administrators' }, { status: 403 });
    const password = await hashPassword(data.password);
    const user = await db.$transaction(async tx => {
      const created = await tx.user.create({ data: { name: data.name!, email: data.email!, role: data.role, password }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } });
      await tx.auditLog.create({ data: { action: 'CREATE', entityType: 'User', entityId: created.id, userId: actor.id, changes: JSON.stringify({ role: created.role, active: created.active }) } });
      return created;
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    if (error?.code === 'P2002') return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
