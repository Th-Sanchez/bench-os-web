import { NextResponse, type NextRequest } from 'next/server';
import { getBackendApiUrl, resolveRequestId, verifyCsrfProtection } from '@/lib/server/upstreamApi';

export async function POST(request: NextRequest) {
  const csrf = verifyCsrfProtection(request);
  if (!csrf.ok) {
    return NextResponse.json({ title: 'Forbidden', detail: csrf.reason, status: 403 }, { status: 403 });
  }

  const requestId = resolveRequestId(request);
  const bodyText = await request.text();

  try {
    const upstream = await fetch(`${getBackendApiUrl()}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-Id': requestId,
      },
      body: bodyText,
      cache: 'no-store',
    });

    const text = await upstream.text();
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      'X-Request-Id': upstream.headers.get('X-Request-Id') || requestId,
    });
    const retryAfter = upstream.headers.get('Retry-After');
    if (retryAfter) headers.set('Retry-After', retryAfter);

    return new NextResponse(text, { status: upstream.status, headers });
  } catch {
    return NextResponse.json(
      { title: 'Service Unavailable', detail: 'Não foi possível alcançar a API do BenchOS.', status: 503 },
      { status: 503 }
    );
  }
}
