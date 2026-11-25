import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookie } from '@/lib/server/sessionCookie';
import { verifyCsrfProtection } from '@/lib/server/upstreamApi';

export async function POST(request: NextRequest) {
  const csrf = verifyCsrfProtection(request);
  if (!csrf.ok) {
    return NextResponse.json({ title: 'Forbidden', detail: csrf.reason, status: 403 }, { status: 403 });
  }

  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
  clearSessionCookie(response);
  return response;
}
