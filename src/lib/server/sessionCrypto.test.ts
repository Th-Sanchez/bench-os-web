import { describe, expect, it } from 'vitest';
import { decryptSession, encryptSession, isSessionExpired } from './sessionCrypto';
import type { AuthResponse } from '@/lib/types/api';

const sampleAuth: AuthResponse = {
  accessToken: 'eyJhbGciOiJIUzI1NiJ9.payload.signature',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  user: {
    id: '01950000-0000-7000-8000-000000000001',
    tenantId: '01950000-0000-7000-8000-000000000002',
    name: 'João Dono',
    email: 'joao@oficina.com.br',
    role: 'OWNER',
    active: true,
    createdAt: '2026-11-01T10:00:00Z',
  },
  tenant: {
    id: '01950000-0000-7000-8000-000000000002',
    name: 'Oficina Central',
    document: '12345678000199',
    phone: '11999999999',
    active: true,
    createdAt: '2026-11-01T10:00:00Z',
  },
};

const TEST_SECRET = 'test-secret-with-more-than-thirty-two-chars-12345';

describe('sessionCrypto', () => {
  it('encrypts and decrypts a full session payload cleanly', () => {
    const token = encryptSession(sampleAuth, TEST_SECRET);
    expect(token.startsWith('v1.')).toBe(true);
    expect(token).not.toContain(sampleAuth.accessToken);
    expect(token.length).toBeLessThan(2048);

    const decoded = decryptSession(token, TEST_SECRET);
    expect(decoded).toEqual(sampleAuth);
  });

  it('rejects tampered tokens and wrong secrets', () => {
    const token = encryptSession(sampleAuth, TEST_SECRET);
    const tampered = `${token.slice(0, -4)}AAAA`;
    expect(decryptSession(tampered, TEST_SECRET)).toBeNull();
    expect(decryptSession(token, 'another-secret-with-more-than-thirty-two-chars!!')).toBeNull();
    expect(decryptSession('invalid-format', TEST_SECRET)).toBeNull();
  });

  it('detects expired and valid session timestamps', () => {
    expect(isSessionExpired(new Date(Date.now() + 120_000).toISOString())).toBe(false);
    expect(isSessionExpired(new Date(Date.now() - 5_000).toISOString())).toBe(true);
    expect(isSessionExpired('not-a-date')).toBe(true);
  });
});
