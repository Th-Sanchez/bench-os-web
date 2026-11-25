import { describe, expect, it } from 'vitest';
import {
  canAccessFinance,
  canEditQuote,
  canManagePartsCatalog,
  canManageShopSettings,
  canManageTeam,
  canTransitionToStatus,
  getValidNextStatuses,
} from './permissions';

describe('RBAC permissions and state machine', () => {
  it('restricts finance, shop settings, and team management to OWNER', () => {
    expect(canAccessFinance('OWNER')).toBe(true);
    expect(canAccessFinance('TECHNICIAN')).toBe(false);
    expect(canAccessFinance('ATTENDANT')).toBe(false);

    expect(canManageShopSettings('OWNER')).toBe(true);
    expect(canManageShopSettings('TECHNICIAN')).toBe(false);

    expect(canManageTeam('OWNER')).toBe(true);
    expect(canManageTeam('ATTENDANT')).toBe(false);
  });

  it('blocks ATTENDANT from quotes and technical bench transitions', () => {
    expect(canEditQuote('OWNER')).toBe(true);
    expect(canEditQuote('TECHNICIAN')).toBe(true);
    expect(canEditQuote('ATTENDANT')).toBe(false);

    expect(canManagePartsCatalog('TECHNICIAN')).toBe(true);
    expect(canManagePartsCatalog('ATTENDANT')).toBe(false);

    expect(canTransitionToStatus('ATTENDANT', 'DIAGNOSING')).toBe(false);
    expect(canTransitionToStatus('ATTENDANT', 'IN_REPAIR')).toBe(false);
    expect(canTransitionToStatus('ATTENDANT', 'READY_FOR_PICKUP')).toBe(false);
    expect(canTransitionToStatus('ATTENDANT', 'APPROVED')).toBe(true);
    expect(canTransitionToStatus('ATTENDANT', 'DELIVERED')).toBe(true);
  });

  it('supports warranty return fast-track DIAGNOSING -> APPROVED when totalPrice is 0', () => {
    expect(getValidNextStatuses('DIAGNOSING')).toEqual(['QUOTE_SENT', 'CANCELLED']);
    expect(
      getValidNextStatuses('DIAGNOSING', { warrantyReturn: true, totalPrice: 0 })
    ).toEqual(['APPROVED', 'QUOTE_SENT', 'CANCELLED']);
    expect(
      getValidNextStatuses('DIAGNOSING', { warrantyReturn: true, totalPrice: 120 })
    ).toEqual(['QUOTE_SENT', 'CANCELLED']);
  });
});
