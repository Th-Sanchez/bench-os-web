import { describe, expect, it } from 'vitest';
import { isAllowedMethod, resolveAllowedBackendPath } from './upstreamApi';

describe('upstreamApi allowlist', () => {
  it('allows valid v1 domain resource paths', () => {
    expect(resolveAllowedBackendPath(['orders', '123', 'items', '456', 'quote'])).toBe(
      '/api/v1/orders/123/items/456/quote'
    );
    expect(resolveAllowedBackendPath(['finance', 'daily-closing'])).toBe(
      '/api/v1/finance/daily-closing'
    );
    expect(resolveAllowedBackendPath(['order-items', 'abandonment-eligible'])).toBe(
      '/api/v1/order-items/abandonment-eligible'
    );
    expect(resolveAllowedBackendPath(['parts-catalog', 'seed-defaults'])).toBe(
      '/api/v1/parts-catalog/seed-defaults'
    );
  });

  it('blocks disallowed prefixes, traversal attempts, and invalid characters', () => {
    expect(resolveAllowedBackendPath([])).toBeNull();
    expect(resolveAllowedBackendPath(['actuator', 'health'])).toBeNull();
    expect(resolveAllowedBackendPath(['auth', 'login'])).toBeNull();
    expect(resolveAllowedBackendPath(['orders', '..', 'actuator'])).toBeNull();
    expect(resolveAllowedBackendPath(['orders', '123?foo=bar'])).toBeNull();
    expect(resolveAllowedBackendPath(['customers', 'foo/bar'])).toBeNull();
  });

  it('validates allowed HTTP methods', () => {
    expect(isAllowedMethod('GET')).toBe(true);
    expect(isAllowedMethod('PATCH')).toBe(true);
    expect(isAllowedMethod('TRACE')).toBe(false);
  });
});
