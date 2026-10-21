import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/security/user-access';
export async function emailSettingsAccess(request: NextRequest, write = false): Promise<{actor: Awaited<ReturnType<typeof currentUser>>; error: NextResponse | null}> {
  const actor = await currentUser(request);
  if (!actor) return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401}), actor: null};
  if (actor.role !== 'SUPER_ADMIN') return {error: NextResponse.json({error: 'Forbidden'}, {status: 403}), actor: null};
  if (write) {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== request.headers.get('host')) return {error: NextResponse.json({error: 'Invalid request origin'}, {status: 403}), actor: null};
  }
  return {error: null, actor};
}
