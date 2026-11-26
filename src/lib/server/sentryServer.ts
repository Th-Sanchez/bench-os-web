import crypto from 'node:crypto';

export interface ParsedSentryDsn {
  envelopeUrl: string;
  publicKey: string;
  projectId: string;
}

export function parseSentryDsn(rawDsn: string | undefined | null): ParsedSentryDsn | null {
  const trimmed = rawDsn?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\/+/, '').split('/')[0];
    if (!publicKey || !projectId || !url.host) {
      return null;
    }
    return {
      envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey,
      projectId,
    };
  } catch {
    return null;
  }
}

/**
 * Lightweight server-side Sentry event reporter for Next.js BFF routes.
 * Sends non-PII error envelopes directly without requiring build-time Sentry plugins.
 */
export async function captureServerBffError(
  error: unknown,
  context: {
    route: string;
    method: string;
    requestId?: string;
    tenantId?: string;
    status?: number;
  }
): Promise<void> {
  const parsed = parseSentryDsn(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (!parsed) return;

  const eventId = crypto.randomUUID().replace(/-/g, '');
  const nowIso = new Date().toISOString();
  const err = error instanceof Error ? error : new Error(String(error));

  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sent_at: nowIso,
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
  const itemHeader = JSON.stringify({ type: 'event' });
  const eventPayload = JSON.stringify({
    event_id: eventId,
    timestamp: Math.floor(Date.now() / 1000),
    platform: 'node',
    level: 'error',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    release: 'benchos-web@1.0.0',
    server_name: 'benchos-web-bff',
    tags: {
      'app.surface': 'web-bff',
      'http.method': context.method,
      'http.path': context.route,
      ...(context.requestId ? { request_id: context.requestId } : {}),
      ...(context.tenantId ? { 'tenant.id': context.tenantId } : {}),
      ...(context.status !== undefined ? { 'http.status': String(context.status) } : {}),
    },
    exception: {
      values: [
        {
          type: err.name || 'Error',
          value: err.message || 'Unexpected BFF error',
        },
      ],
    },
  });

  const body = `${envelopeHeader}\n${itemHeader}\n${eventPayload}`;

  try {
    await fetch(parsed.envelopeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=benchos-web-bff/1.0.0`,
      },
      body,
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Observability failures must never break user requests
  }
}
