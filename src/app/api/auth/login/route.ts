import { NextResponse, type NextRequest } from 'next/server';
import { attachSessionCookie, toClientSession } from '@/lib/server/sessionCookie';
import { getBackendApiUrl, resolveRequestId, verifyCsrfProtection } from '@/lib/server/upstreamApi';
import type { AuthResponse } from '@/lib/types/api';

export async function POST(request: NextRequest) {
  const csrf = verifyCsrfProtection(request);
  if (!csrf.ok) {
    return NextResponse.json({ title: 'Forbidden', detail: csrf.reason, status: 403 }, { status: 403 });
  }

  const requestId = resolveRequestId(request);
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json({ title: 'Bad Request', detail: 'Invalid request body', status: 400 }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getBackendApiUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-Id': requestId,
      },
      body: bodyText,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        title: 'Service Unavailable',
        detail: 'Não foi possível alcançar a API do BenchOS. Verifique se o backend está online.',
        status: 503,
        requestId,
      },
      { status: 503, headers: { 'X-Request-Id': requestId } }
    );
  }

  const upstreamText = await upstream.text();
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Request-Id': upstream.headers.get('X-Request-Id') || requestId,
  });
  const retryAfter = upstream.headers.get('Retry-After');
  if (retryAfter) headers.set('Retry-After', retryAfter);

  if (!upstream.ok) {
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/problem+json');
    return new NextResponse(upstreamText, { status: upstream.status, headers });
  }

  const auth = JSON.parse(upstreamText) as AuthResponse;
  const response = NextResponse.json(toClientSession(auth), { status: 200, headers });
  attachSessionCookie(response, auth);
  return response;
}
