import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';

const ALLOWED_V1_PREFIXES = [
  'users',
  'tenant',
  'customers',
  'orders',
  'order-items',
  'parts-catalog',
  'finance',
] as const;

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

export function getBackendApiUrl(): string {
  const raw = process.env.BACKEND_API_URL?.trim() || 'http://localhost:8080';
  return raw.replace(/\/+$/, '');
}

/**
 * Validates that a proxy path segment array maps strictly to an allowlisted
 * `/api/v1/<resource>/...` path without traversal or control characters.
 */
export function resolveAllowedBackendPath(segments: string[]): string | null {
  if (!Array.isArray(segments) || segments.length === 0 || segments.length > 10) {
    return null;
  }

  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..' || !SAFE_SEGMENT.test(segment)) {
      return null;
    }
  }

  const rootResource = segments[0];
  if (!(ALLOWED_V1_PREFIXES as readonly string[]).includes(rootResource)) {
    return null;
  }

  return `/api/v1/${segments.join('/')}`;
}

export function isAllowedMethod(method: string): boolean {
  return ALLOWED_METHODS.has(method.toUpperCase());
}

/**
 * Mitigates CSRF on state-changing BFF routes by requiring a custom header
 * (`X-BenchOS-Client: web`) and matching Origin/Host when Origin is present.
 */
export function verifyCsrfProtection(request: NextRequest): { ok: boolean; reason?: string } {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { ok: true };
  }

  const clientHeader = request.headers.get('x-benchos-client');
  if (clientHeader !== 'web') {
    return { ok: false, reason: 'Missing required client header' };
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost.toLowerCase() !== host.toLowerCase()) {
        return { ok: false, reason: 'Origin mismatch' };
      }
    } catch {
      return { ok: false, reason: 'Malformed Origin header' };
    }
  }

  return { ok: true };
}

export function resolveRequestId(request: NextRequest): string {
  const incoming = request.headers.get('x-request-id')?.trim();
  if (incoming && /^[a-zA-Z0-9._-]{8,64}$/.test(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}
