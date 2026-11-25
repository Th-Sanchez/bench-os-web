import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { ClientSession } from '@/lib/types/api';
import {
  decryptSession,
  encryptSession,
  isSessionExpired,
  type ServerSessionPayload,
} from './sessionCrypto';

export const SESSION_COOKIE_NAME = 'benchos_session';
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24;

export function toClientSession(session: ServerSessionPayload): ClientSession {
  return {
    expiresAt: session.expiresAt,
    user: session.user,
    tenant: session.tenant,
  };
}

export function computeCookieMaxAge(expiresAt: string | undefined): number {
  if (!expiresAt) return DEFAULT_MAX_AGE_SECONDS;
  const ms = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return Math.max(60, Math.floor(ms / 1000));
}

export function attachSessionCookie(response: NextResponse, payload: ServerSessionPayload): void {
  const encrypted = encryptSession(payload);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: encrypted,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: computeCookieMaxAge(payload.expiresAt),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function readServerSession(): Promise<ServerSessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  const decoded = decryptSession(raw);
  if (!decoded) return null;
  if (isSessionExpired(decoded.expiresAt)) return null;
  return decoded;
}

export function readSessionFromCookieValue(raw: string | undefined): ServerSessionPayload | null {
  const decoded = decryptSession(raw);
  if (!decoded) return null;
  if (isSessionExpired(decoded.expiresAt)) return null;
  return decoded;
}
