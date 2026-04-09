import { NextRequest, NextResponse } from 'next/server';
import { canAccess, getRoleFromToken } from './lib/rbac';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth pages and API routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Decode role (no signature check — API validates tokens for real)
  const role = getRoleFromToken(token);

  if (!role) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role doesn't have access → redirect to dashboard root
  if (!canAccess(role, pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
