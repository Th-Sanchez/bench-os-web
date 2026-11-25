import type { ItemStatus, OrderItemQueueResponse, Role, ServiceOrderItemResponse } from '@/lib/types/api';

const TECHNICAL_ONLY_TARGET_STATUSES = new Set<ItemStatus>([
  'DIAGNOSING',
  'QUOTE_SENT',
  'WAITING_PARTS',
  'IN_REPAIR',
  'READY_FOR_PICKUP',
]);

export function isOwner(role: Role | undefined | null): boolean {
  return role === 'OWNER';
}

export function canAccessFinance(role: Role | undefined | null): boolean {
  return role === 'OWNER';
}

export function canEditQuote(role: Role | undefined | null): boolean {
  return role === 'OWNER' || role === 'TECHNICIAN';
}

export function canManagePartsCatalog(role: Role | undefined | null): boolean {
  return role === 'OWNER' || role === 'TECHNICIAN';
}

export function canManageShopSettings(role: Role | undefined | null): boolean {
  return role === 'OWNER';
}

export function canManageTeam(role: Role | undefined | null): boolean {
  return role === 'OWNER';
}

export function canTransitionToStatus(role: Role | undefined | null, target: ItemStatus): boolean {
  if (!role) return false;
  if (role === 'OWNER' || role === 'TECHNICIAN') return true;
  return !TECHNICAL_ONLY_TARGET_STATUSES.has(target);
}

/**
 * Mirrors backend ServiceOrderItem state machine transitions.
 */
export function getValidNextStatuses(
  current: ItemStatus,
  options?: { warrantyReturn?: boolean; totalPrice?: number }
): ItemStatus[] {
  const isFreeWarrantyReturn =
    Boolean(options?.warrantyReturn) && (options?.totalPrice ?? 0) === 0;

  switch (current) {
    case 'RECEIVED':
      return ['DIAGNOSING', 'CANCELLED'];
    case 'DIAGNOSING':
      return isFreeWarrantyReturn
        ? ['APPROVED', 'QUOTE_SENT', 'CANCELLED']
        : ['QUOTE_SENT', 'CANCELLED'];
    case 'QUOTE_SENT':
      return ['APPROVED', 'REJECTED', 'CANCELLED'];
    case 'APPROVED':
      return ['IN_REPAIR', 'WAITING_PARTS', 'QUOTE_SENT', 'CANCELLED'];
    case 'WAITING_PARTS':
      return ['IN_REPAIR', 'QUOTE_SENT', 'CANCELLED'];
    case 'IN_REPAIR':
      return ['READY_FOR_PICKUP', 'WAITING_PARTS', 'QUOTE_SENT', 'CANCELLED'];
    case 'READY_FOR_PICKUP':
      return ['DELIVERED', 'DISCARDED', 'CANCELLED'];
    case 'REJECTED':
      return ['DELIVERED', 'DISCARDED', 'CANCELLED'];
    case 'DELIVERED':
    case 'DISCARDED':
    case 'CANCELLED':
    default:
      return [];
  }
}

export function canEditQuoteForStatus(status: ItemStatus): boolean {
  return status === 'RECEIVED' || status === 'DIAGNOSING' || status === 'QUOTE_SENT';
}

export function canDeliverItem(status: ItemStatus): boolean {
  return status === 'READY_FOR_PICKUP' || status === 'REJECTED';
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getWaitingDays(item: Pick<OrderItemQueueResponse, 'status' | 'finishedAt' | 'updatedAt'>): number {
  const refIso =
    item.status === 'READY_FOR_PICKUP' && item.finishedAt ? item.finishedAt : item.updatedAt;
  const refMs = Date.parse(refIso);
  if (Number.isNaN(refMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - refMs) / MS_PER_DAY));
}

export function getWarrantyRemainingDays(
  item: Pick<ServiceOrderItemResponse, 'status' | 'deliveredAt' | 'warrantyDays'>
): { active: boolean; remainingDays: number; expiresAt: Date | null } {
  if (item.status !== 'DELIVERED' || !item.deliveredAt || !item.warrantyDays || item.warrantyDays <= 0) {
    return { active: false, remainingDays: 0, expiresAt: null };
  }
  const deliveredMs = Date.parse(item.deliveredAt);
  if (Number.isNaN(deliveredMs)) {
    return { active: false, remainingDays: 0, expiresAt: null };
  }
  const expiresMs = deliveredMs + item.warrantyDays * MS_PER_DAY;
  const remainingDays = Math.ceil((expiresMs - Date.now()) / MS_PER_DAY);
  return {
    active: remainingDays > 0,
    remainingDays: Math.max(0, remainingDays),
    expiresAt: new Date(expiresMs),
  };
}

export function isOverdueEstimatedDate(estimatedCompletionDate: string | null | undefined): boolean {
  if (!estimatedCompletionDate) return false;
  const todayIso = new Date().toISOString().slice(0, 10);
  return estimatedCompletionDate < todayIso;
}
