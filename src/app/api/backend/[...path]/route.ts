import { NextResponse, type NextRequest } from 'next/server';
import { captureServerBffError } from '@/lib/server/sentryServer';
import { clearSessionCookie, readServerSession } from '@/lib/server/sessionCookie';
import {
  getBackendApiUrl,
  isAllowedMethod,
  resolveAllowedBackendPath,
  resolveRequestId,
  verifyCsrfProtection,
} from '@/lib/server/upstreamApi';

export const dynamic = 'force-dynamic';

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  if (!isAllowedMethod(request.method)) {
    return NextResponse.json({ title: 'Method Not Allowed', status: 405 }, { status: 405 });
  }

  const csrf = verifyCsrfProtection(request);
  if (!csrf.ok) {
    return NextResponse.json(
      { title: 'Forbidden', detail: csrf.reason, status: 403 },
      { status: 403 }
    );
  }

  const { path } = await context.params;
  const targetPath = resolveAllowedBackendPath(path);
  if (!targetPath) {
    return NextResponse.json(
      { title: 'Not Found', detail: 'Route is not allowed through the BFF proxy', status: 404 },
      { status: 404 }
    );
  }

  const session = await readServerSession();
  if (!session) {
    const unauthorized = NextResponse.json(
      { title: 'Unauthorized', detail: 'Sessão expirada ou ausente. Faça login novamente.', status: 401 },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
    clearSessionCookie(unauthorized);
    return unauthorized;
  }

  const requestId = resolveRequestId(request);
  const queryString = request.nextUrl.search;
  const upstreamUrl = `${getBackendApiUrl()}${targetPath}${queryString}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
    Accept: 'application/json',
    'X-Request-Id': requestId,
  };

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const rawBody = await request.text();
    if (rawBody) {
      body = rawBody;
      headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });
  } catch (upstreamError) {
    void captureServerBffError(upstreamError, {
      route: targetPath,
      method: request.method,
      requestId,
      tenantId: session.tenant.id,
      status: 502,
    });
    return NextResponse.json(
      {
        title: 'Bad Gateway',
        detail: 'Não foi possível comunicar com a API do BenchOS.',
        status: 502,
        requestId,
      },
      { status: 502, headers: { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' } }
    );
  }

  const responseHeaders = new Headers({
    'Cache-Control': 'no-store',
    'X-Request-Id': upstream.headers.get('X-Request-Id') || requestId,
  });

  const retryAfter = upstream.headers.get('Retry-After');
  if (retryAfter) responseHeaders.set('Retry-After', retryAfter);

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  const responseText = await upstream.text();
  responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');

  const response = new NextResponse(responseText, {
    status: upstream.status,
    headers: responseHeaders,
  });

  if (upstream.status === 401) {
    clearSessionCookie(response);
  }

  return response;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, context);
}
