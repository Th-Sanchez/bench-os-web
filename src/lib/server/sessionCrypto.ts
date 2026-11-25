import crypto from 'node:crypto';
import type { AuthResponse } from '@/lib/types/api';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX = 'v1';

export type ServerSessionPayload = AuthResponse;

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters in production');
  }
  return 'benchos-local-dev-session-secret-change-in-production-32bytes!';
}

function deriveKey(secretOverride?: string): Buffer {
  const secret = secretOverride ?? resolveSessionSecret();
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptSession(payload: ServerSessionPayload, secretOverride?: string): string {
  const key = deriveKey(secretOverride);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return `${VERSION_PREFIX}.${packed.toString('base64url')}`;
}

export function decryptSession(token: string | undefined | null, secretOverride?: string): ServerSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2 || parts[0] !== VERSION_PREFIX) return null;

  try {
    const packed = Buffer.from(parts[1], 'base64url');
    if (packed.length <= IV_LENGTH + AUTH_TAG_LENGTH) return null;

    const iv = packed.subarray(0, IV_LENGTH);
    const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(secretOverride);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8')) as ServerSessionPayload;

    if (!parsed?.accessToken || !parsed?.user?.id || !parsed?.tenant?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isSessionExpired(expiresAt: string | null | undefined, skewMs = 30_000): boolean {
  if (!expiresAt) return true;
  const expiryMs = Date.parse(expiresAt);
  if (Number.isNaN(expiryMs)) return true;
  return Date.now() >= expiryMs - skewMs;
}
