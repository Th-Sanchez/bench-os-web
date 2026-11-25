import { NextResponse, type NextRequest } from 'next/server';
import { readSessionFromCookieValue, SESSION_COOKIE_NAME } from '@/lib/server/sessionCookie';

const AUTH_PAGES = ['/login', '/register', '/forgot-password'];
const OWNER_ONLY_PREFIXES = ['/finance'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const rawCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = readSessionFromCookieValue(rawCookie);
  const isAuthPage = AUTH_PAGES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!session) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/' && pathname !== '/workbench') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage || pathname === '/') {
    return NextResponse.redirect(new URL('/workbench', request.url));
  }

  const isOwnerOnly = OWNER_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isOwnerOnly && session.user.role !== 'OWNER') {
    return NextResponse.redirect(new URL('/workbench', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
