import type { ProblemDetail } from '@/lib/types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly problem?: ProblemDetail;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    message: string,
    problem?: ProblemDetail,
    requestId?: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    this.requestId = requestId ?? problem?.requestId;
    this.retryAfterSeconds = retryAfterSeconds ?? problem?.retryAfterSeconds;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  skipUnauthorizedHandler?: boolean;
}

function buildUrl(basePath: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, item);
        }
      } else {
        params.append(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

async function performFetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipUnauthorizedHandler = false } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-BenchOS-Client': 'web',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
  }

  const headerRequestId = response.headers.get('X-Request-Id') ?? undefined;
  const retryAfterHeader = response.headers.get('Retry-After');
  const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined;

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    const problem = (parsed && typeof parsed === 'object' ? parsed : undefined) as ProblemDetail | undefined;
    const requestId = headerRequestId ?? problem?.requestId;
    const fieldErrors = problem?.errors
      ? Object.values(problem.errors).filter(Boolean).join(' · ')
      : undefined;
    const message =
      fieldErrors ||
      problem?.detail ||
      problem?.title ||
      `Request failed with status ${response.status}`;

    if (response.status === 401 && !skipUnauthorizedHandler && unauthorizedHandler) {
      unauthorizedHandler();
    }

    throw new ApiError(
      response.status,
      message,
      problem,
      requestId,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : problem?.retryAfterSeconds
    );
  }

  return parsed as T;
}

/**
 * Calls the Next.js BFF proxy (`/api/backend/...`) which attaches the HttpOnly session JWT server-side.
 */
export async function apiRequest<T>(v1Path: string, options: RequestOptions = {}): Promise<T> {
  const clean = v1Path.replace(/^\/?api\/v1\/?/, '').replace(/^\/+/, '');
  const url = buildUrl(`/api/backend/${clean}`, options.query);
  return performFetch<T>(url, options);
}

/**
 * Calls local BFF auth endpoints (`/api/auth/...`).
 */
export async function bffAuthRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const clean = path.replace(/^\/+/, '');
  const url = buildUrl(`/api/auth/${clean}`, options.query);
  return performFetch<T>(url, { ...options, skipUnauthorizedHandler: true });
}
