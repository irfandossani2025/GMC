import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/auth/login', '/api/auth/login', '/setup', '/api/setup/admin'];
const adminRoutes = ['/admin', '/api/admin', '/dashboard/users', '/api/users'];

interface MiddlewareTokenPayload {
	  userId: string;
	  email: string;
	  role: string;
	  exp?: number;
}
	  
	  function decodeBase64Url(value: string): string {
		    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
		    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
		    return atob(padded);
	  }
	
	async function verifyHs256Token(token: string, secret: string): Promise<MiddlewareTokenPayload | null> {
		  try {
		    const parts = token.split('.');
	    if (parts.length !== 3) {
			      return null;
		}
	
	    const [headerPart, payloadPart, signaturePart] = parts;
	    const header = JSON.parse(decodeBase64Url(headerPart));
	
	    if (header.alg !== 'HS256') {
			      return null;
		}
	
	    const encoder = new TextEncoder();
	    const keyData = encoder.encode(secret);
	    const cryptoKey = await crypto.subtle.importKey(
			      'raw',
			      keyData,
			{ name: 'HMAC', hash: 'SHA-256' },
			      false,
			      ['verify']
			    );
	
	    const data = encoder.encode(`${headerPart}.${payloadPart}`);
	    const sigBytes = Uint8Array.from(
			      atob(signaturePart.replace(/-/g, '+').replace(/_/g, '/')),
			      (c) => c.charCodeAt(0)
			    );
	
	    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, data);
	    if (!valid) {
			      return null;
		}
	
	    const payload = JSON.parse(decodeBase64Url(payloadPart)) as MiddlewareTokenPayload;
	
	    if (payload.exp && payload.exp * 1000 < Date.now()) {
			      return null;
		}
	
	    return payload;
} catch {
	    return null;
}
}

export async function middleware(request: NextRequest) {
	  const { pathname } = request.nextUrl;
	
	  // Allow public routes
	  if (publicRoutes.some(route => pathname.startsWith(route))) {
		      return NextResponse.next();
	  }
	
	  // Only apply to dashboard and API routes
	  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/api')) {
		      return NextResponse.next();
	  }
	
	  const token = request.cookies.get('auth-token')?.value;
	
	  if (!token) {
		      if (pathname.startsWith('/api')) {
				        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
			  }
		      return NextResponse.redirect(new URL('/auth/login', request.url));
	  }
	
	  const secret = process.env.JWT_SECRET || 'fallback-secret';
	  const decoded = await verifyHs256Token(token, secret);
	
	  if (!decoded) {
		      // Token invalid or expired, redirect to login
		      const response = NextResponse.redirect(new URL('/auth/login', request.url));
		      response.cookies.delete('auth-token');
		      return response;
	  }
	
	  // Check admin routes
	  if (adminRoutes.some(route => pathname.startsWith(route))) {
		      if (decoded.role !== 'ADMIN') {
				        if (pathname.startsWith('/api')) {
							        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
						}
				        return NextResponse.redirect(new URL('/dashboard', request.url));
			  }
	  }
	
	  // Add user info to request headers
	  const requestHeaders = new Headers(request.headers);
	  requestHeaders.set('x-user-id', decoded.userId);
	  requestHeaders.set('x-user-role', decoded.role);
	
	  return NextResponse.next({
		      request: {
				        headers: requestHeaders,
			  },
	  });
}

export const config = {
	  matcher: [
		      '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
		    ],
};