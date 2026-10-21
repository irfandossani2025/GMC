import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/security/user-access';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    return user ? NextResponse.json({ userId: user.id, email: user.email, role: user.role, user }) : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Unable to check account status' }, { status: 500 });
  }
}
