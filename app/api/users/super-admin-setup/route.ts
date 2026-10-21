import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser, isAdministrator } from '@/lib/security/user-access';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
// Hosting owner must explicitly configure both values before provisioning.
async function setupActor(request: NextRequest) {
  const actor = await currentUser(request);
  const owner = process.env.SUPER_ADMIN_SETUP_OWNER;
  const email = process.env.SUPER_ADMIN_SETUP_EMAIL;
  return actor && isAdministrator(actor.role) && owner && email && actor.email.toLowerCase() === owner.toLowerCase() ? actor : null;
}
export async function GET(request: NextRequest) {
  const actor = await setupActor(request);
  if (!actor) return NextResponse.json({ enabled: false, error: 'Super Admin setup is locked. Ask the hosting owner to configure the account.' }, { status: 403 });
  const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM users WHERE role::text = 'SUPER_ADMIN'`;
  const exists = Number(rows[0].count);
  return NextResponse.json({ enabled: exists === 0, email: process.env.SUPER_ADMIN_SETUP_EMAIL });
}
export async function POST(request: NextRequest) {
  try {
    const actor = await setupActor(request);
    if (!actor) return NextResponse.json({ error: 'Super Admin setup is locked' }, { status: 403 });
    const data = z.object({ name: z.string().trim().min(2), password: z.string().min(12), confirmPassword: z.string(), confirmAccess: z.literal(true) }).parse(await request.json());
    if (data.password !== data.confirmPassword) return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    const password = await hashPassword(data.password);
    // The app uses its configured database connection; panel command runners may not inherit it.
    // Commit the additive enum value before inserting an account with that value.
    await db.$executeRawUnsafe('ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS \'SUPER_ADMIN\'');
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7231042)`;
      if (await tx.user.count({ where: { role: 'SUPER_ADMIN' } })) return null;
      const user = await tx.user.create({ data: { name: data.name, email: process.env.SUPER_ADMIN_SETUP_EMAIL!, password, role: 'SUPER_ADMIN', active: true }, select: { id: true, email: true } });
      await tx.auditLog.create({ data: { action: 'CREATE_SUPER_ADMIN', entityType: 'User', entityId: user.id, userId: actor.id, changes: JSON.stringify({ role: 'SUPER_ADMIN' }) } });
      return user;
    });
    if (!result) return NextResponse.json({ error: 'Super Admin setup has already been completed' }, { status: 409 });
    return NextResponse.json({ success: true, user: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    if (error?.code === 'P2002') return NextResponse.json({ error: 'That email is already in use. Choose a separate Super Admin email.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to create Super Admin account' }, { status: 500 });
  }
}
