'use client';

import * as Sentry from '@sentry/browser';
import type { ClientSession } from '@/lib/types/api';

export interface WebSentryConfig {
  dsn: string | null;
  environment: string;
}

let initialized = false;
let enabled = false;

export function initSentryClient(config: WebSentryConfig): void {
  if (initialized) return;
  initialized = true;

  const dsn = (config.dsn ?? '').trim();
  if (!dsn) {
    enabled = false;
    return;
  }

  enabled = true;
  Sentry.init({
    dsn,
    environment: config.environment || 'production',
    release: 'benchos-web@1.0.0',
    beforeSend(event) {
      if (event.request?.headers) {
        const cleanHeaders = { ...event.request.headers };
        delete cleanHeaders.Authorization;
        delete cleanHeaders.authorization;
        delete cleanHeaders.Cookie;
        delete cleanHeaders.cookie;
        event.request.headers = cleanHeaders;
      }
      return event;
    },
  });

  Sentry.setTag('app.surface', 'web');
  Sentry.setTag('app.env', config.environment || 'production');
}

export function setSentryUserContext(session: ClientSession | null): void {
  if (!enabled) return;

  if (!session) {
    Sentry.setUser(null);
    Sentry.setTag('tenant.id', undefined);
    Sentry.setTag('user.role', undefined);
    Sentry.setContext('workshop', null);
    return;
  }

  Sentry.setUser({ id: session.user.id });
  Sentry.setTag('tenant.id', session.tenant.id);
  Sentry.setTag('user.role', session.user.role);
  Sentry.setContext('workshop', {
    tenantId: session.tenant.id,
    tenantName: session.tenant.name,
    operatorRole: session.user.role,
  });
}

export function captureWebApiError(
  error: unknown,
  context: {
    method: string;
    path: string;
    status?: number;
    requestId?: string;
  }
): void {
  if (!enabled) return;

  if (typeof context.status === 'number' && context.status >= 400 && context.status < 500) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('error.source', 'web_api');
    scope.setTag('http.method', context.method);
    scope.setTag('http.path', context.path);
    if (context.status !== undefined) {
      scope.setTag('http.status', String(context.status));
    }
    if (context.requestId) {
      scope.setTag('backend.request_id', context.requestId);
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

export function captureWebException(
  error: unknown,
  tags?: Record<string, string>
): void {
  if (!enabled) return;

  Sentry.withScope((scope) => {
    if (tags) {
      for (const [k, v] of Object.entries(tags)) {
        scope.setTag(k, v);
      }
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}
