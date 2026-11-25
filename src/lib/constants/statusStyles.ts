import type { ItemStatus } from '@/lib/types/api';

export interface StatusVisual {
  bg: string;
  text: string;
  dot: string;
  border: string;
  columnAccent: string;
}

export const ITEM_STATUS_STYLES: Record<ItemStatus, StatusVisual> = {
  RECEIVED: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
    border: 'border-slate-200',
    columnAccent: 'border-t-slate-400',
  },
  DIAGNOSING: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    dot: 'bg-blue-600',
    border: 'border-blue-200',
    columnAccent: 'border-t-blue-500',
  },
  QUOTE_SENT: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
    columnAccent: 'border-t-amber-500',
  },
  APPROVED: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    dot: 'bg-blue-600',
    border: 'border-blue-200',
    columnAccent: 'border-t-blue-600',
  },
  WAITING_PARTS: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-600',
    border: 'border-amber-200',
    columnAccent: 'border-t-amber-600',
  },
  IN_REPAIR: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    dot: 'bg-indigo-600',
    border: 'border-indigo-200',
    columnAccent: 'border-t-indigo-600',
  },
  READY_FOR_PICKUP: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
    columnAccent: 'border-t-emerald-500',
  },
  DELIVERED: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-emerald-500',
    border: 'border-slate-200',
    columnAccent: 'border-t-emerald-600',
  },
  REJECTED: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    dot: 'bg-red-600',
    border: 'border-red-200',
    columnAccent: 'border-t-red-500',
  },
  DISCARDED: {
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
    columnAccent: 'border-t-slate-400',
  },
  CANCELLED: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    dot: 'bg-red-600',
    border: 'border-red-200',
    columnAccent: 'border-t-red-500',
  },
};

export const KANBAN_STATUSES: ItemStatus[] = [
  'RECEIVED',
  'DIAGNOSING',
  'QUOTE_SENT',
  'APPROVED',
  'WAITING_PARTS',
  'IN_REPAIR',
  'READY_FOR_PICKUP',
  'REJECTED',
];

export const ACTIVE_BENCH_STATUSES: ItemStatus[] = [...KANBAN_STATUSES];
