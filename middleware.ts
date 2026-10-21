import { NextRequest, NextResponse } from 'next/server';
const publicRoutes = ['/api/auth/login', '/api/setup/admin'];
const adminRoutes = ['/admin', '/api/admin', '/dashboard/users', '/api/users', '/dashboard/super-admin-setup'];
const staffAllowedPaths = ['/dashboard/scan', '/api/scan', '/api/sessions', '/api/auth/logout', '/api/auth/me'];
const matches = (path: string, route: string) => path === route || path.startsWith(`${route}/`);
interface Payload { userId: string; role: string; exp: number }
function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
}
async function verify(token: string, secret: string): Promise<Payload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    if (JSON.parse(decodeBase64Url(header)).alg !== 'HS256') return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(decodeBase64Url(signature), c => c.charCodeAt(0)), new TextEncoder().encode(`${header}.${payload}`));
    if (!valid) return null;
    const data = JSON.parse(decodeBase64Url(payload)) as Payload;
    if (!data.userId || !Number.isFinite(data.exp) || data.exp * 1000 <= Date.now() || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'].includes(data.role)) return null;
    return data;
  } catch { return null; }
}
function unauthenticated(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL('/auth/login', request.url);
  url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicRoutes.includes(path)) return NextResponse.next();
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'local-development-secret-change-me' : '');
  const token = request.cookies.get('auth-token')?.value;
  const actor = secret && token ? await verify(token, secret) : null;
  if (!actor) return unauthenticated(request);
  const superAdminOnly = ['/dashboard/settings', '/api/settings'];
  if (actor.role !== 'SUPER_ADMIN' && superAdminOnly.some(route => matches(path, route))) {
    if (path.startsWith('/api/')) return NextResponse.json({error: 'Forbidden'}, {status: 403});
    return NextResponse.redirect(new URL(actor.role === 'STAFF' ? '/dashboard/scan' : '/dashboard', request.url));
  }
  const isAdmin = actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN';
  const forbidden = (!isAdmin && adminRoutes.some(route => matches(path, route))) || (actor.role === 'STAFF' && !staffAllowedPaths.some(route => matches(path, route)));
  if (forbidden) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.redirect(new URL(actor.role === 'STAFF' ? '/dashboard/scan' : '/dashboard', request.url));
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', actor.userId);
  requestHeaders.set('x-user-role', actor.role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
export const config = { matcher: ['/dashboard/:path*', '/api/:path*', '/admin/:path*'] };
