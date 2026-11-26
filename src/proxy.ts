import { NextResponse, type NextRequest } from 'next/server';
import { readSessionFromCookieValue, SESSION_COOKIE_NAME } from '@/lib/server/sessionCookie';
import { getAppUrl, isMarketingHost, isPublicMarketingPath } from '@/lib/siteConfig';

const AUTH_PAGES = ['/login', '/register', '/forgot-password'];
const OWNER_ONLY_PREFIXES = ['/finance'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const marketingDomain = isMarketingHost(host);

  if (marketingDomain) {
    if (pathname === '/') {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = '/site';
      return NextResponse.rewrite(rewriteUrl);
    }

    if (isPublicMarketingPath(pathname)) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL(`${pathname}${search}`, getAppUrl()));
  }

  if (isPublicMarketingPath(pathname)) {
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
