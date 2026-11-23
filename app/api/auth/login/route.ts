import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'setup-username') {
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      const desiredUsername = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
      const setupPassword = typeof body.password === 'string' ? body.password : '';
      if (!/^[a-z0-9._-]{3,32}$/.test(desiredUsername) || !userId || setupPassword.length < 6) {
      if (desiredUsername === 'superadmingmc') return NextResponse.json({ error: 'That username is reserved.' }, { status: 409 });
        return NextResponse.json({ error: 'Choose a username with 3–32 letters, numbers, dots, hyphens or underscores.' }, { status: 400 });
      }
      const account = await db.user.findUnique({ where: { id: userId } });
      if (!account || !account.active || account.role === 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Invalid User ID or password' }, { status: 401 });
      }
      if (account.username) {
        return NextResponse.json({ error: 'A username has already been set for this account.' }, { status: 409 });
      }
      if (!(await verifyPassword(setupPassword, account.password))) {
        return NextResponse.json({ error: 'Invalid User ID or password' }, { status: 401 });
      }
      try {
        await db.user.update({ where: { id: account.id }, data: { username: desiredUsername } });
      } catch (error: any) {
        if (error?.code === 'P2002') return NextResponse.json({ error: 'That username is already taken. Choose another.' }, { status: 409 });
        throw error;
      }
      return NextResponse.json({ success: true });
    }

    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const isSuperAdminLogin = body.superAdmin === true && username === 'superadmingmc';

    if (!username || password.length < 6) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = isSuperAdminLogin
      ? ((await db.user.findUnique({ where: { username: 'superadmingmc' } })) ?? (await db.user.findFirst({ where: { role: 'SUPER_ADMIN', active: true, username: null }, orderBy: { createdAt: 'asc' } }))) /* multi-super-admin */
      : body.superAdmin === true
        ? null
        : await db.user.findUnique({ where: { username } });

    if (!user || !user.active || (user.role === 'SUPER_ADMIN' && !isSuperAdminLogin && (!user.username || user.username === 'superadmingmc')) || (isSuperAdminLogin && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let resolvedUsername = user.username;
    if (isSuperAdminLogin && user.role === 'SUPER_ADMIN' && user.username !== 'superadmingmc') {
      await db.user.update({ where: { id: user.id }, data: { username: 'superadmingmc' } });
      resolvedUsername = 'superadmingmc';
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: resolvedUsername, email: user.email, name: user.name, role: user.role },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
