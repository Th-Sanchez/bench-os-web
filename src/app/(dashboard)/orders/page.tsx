'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Spinner,
  StatusBadge,
  TagBadge,
  WarrantyBadge,
} from '@/components/ui/Primitives';
import { ordersApi } from '@/lib/api/endpoints';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { ItemStatus } from '@/lib/types/api';
import { formatBRL, formatDate, maskPhoneBR } from '@/lib/utils/masks';

const FILTER_STATUSES: (ItemStatus | 'ALL')[] = [
  'ALL',
  'RECEIVED',
  'DIAGNOSING',
  'QUOTE_SENT',
  'APPROVED',
  'WAITING_PARTS',
  'IN_REPAIR',
  'READY_FOR_PICKUP',
  'DELIVERED',
  'REJECTED',
  'DISCARDED',
  'CANCELLED',
];

export default function OrdersListPage() {
  const { locale, t } = useI18n();
  const [page, setPage] = useState(0);
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'ALL'>('ALL');

  const parsedOrderNumber = orderNumberInput.trim()
    ? Number.parseInt(orderNumberInput.replace(/\D/g, ''), 10)
    : undefined;

  const ordersQuery = useQuery({
    queryKey: ['orders', page, parsedOrderNumber ?? null, statusFilter],
    queryFn: () =>
      ordersApi.list({
        orderNumber: Number.isFinite(parsedOrderNumber) ? parsedOrderNumber : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        size: 20,
      }),
  });

  const data = ordersQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.orders}</h1>
          <p className="text-sm text-slate-500">
            {data
              ? `${data.totalElements} ${locale === 'en' ? 'orders found' : 'ordens encontradas'}`
              : t.common.loading}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void ordersQuery.refetch()}
            loading={ordersQuery.isFetching}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.common.refresh}
          </Button>
          <Link href="/orders/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              {t.nav.newOrder}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={orderNumberInput}
            onChange={(e) => {
              setOrderNumberInput(e.target.value);
              setPage(0);
            }}
            placeholder={locale === 'en' ? 'Order # (e.g. 1042)' : 'Nº da OS (ex: 1042)'}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ItemStatus | 'ALL');
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {FILTER_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st === 'ALL'
                ? locale === 'en'
                  ? 'All statuses'
                  : 'Todos os status'
                : t.status[st]}
            </option>
          ))}
        </select>
      </div>

      {ordersQuery.isLoading ? (
        <Spinner label={t.common.loading} />
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title={t.common.noResults}
          action={
            <Link href="/orders/new">
              <Button>
                <Plus className="h-4 w-4" />
                {t.nav.newOrder}
              </Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">OS</th>
                  <th className="px-4 py-3">{locale === 'en' ? 'Customer' : 'Cliente'}</th>
                  <th className="px-4 py-3">{locale === 'en' ? 'Appliances' : 'Aparelhos'}</th>
                  <th className="px-4 py-3">{locale === 'en' ? 'Date' : 'Entrada'}</th>
                  <th className="px-4 py-3 text-right">{locale === 'en' ? 'Total' : 'Total'}</th>
                  <th className="px-4 py-3 text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.content.map((order) => {
                  const total = order.items
                    .filter((i) => i.status !== 'CANCELLED' && i.status !== 'REJECTED')
                    .reduce((acc, i) => acc + i.totalPrice, 0);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-mono text-sm font-bold text-blue-600 hover:underline"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <Link
                          href={`/customers/${order.customerId}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {order.customerName ?? '—'}
                        </Link>
                        {order.customerPhone && (
                          <p className="font-mono text-xs text-slate-500">
                            {maskPhoneBR(order.customerPhone)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1.5">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex flex-wrap items-center gap-2">
                              <TagBadge tag={item.tag} dark={false} />
                              <span className="text-xs font-semibold text-slate-800">
                                {item.applianceType} {item.brand}
                              </span>
                              <StatusBadge status={item.status} size="xs" />
                              {item.warrantyReturn && <WarrantyBadge />}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap font-mono text-xs text-slate-600">
                        {formatDate(order.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap text-right font-mono font-bold text-slate-900 tabular-nums">
                        {total > 0 ? formatBRL(total, locale) : '—'}
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap text-right">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            {t.common.viewDetails}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>
                {locale === 'en' ? 'Page' : 'Página'} {data.page + 1} / {data.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
