'use client';

import React, { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  MessageCircle,
  Pencil,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';
import { WarrantyReturnModal } from '@/components/orders/WarrantyReturnModal';
import {
  Button,
  Card,
  EmptyState,
  Spinner,
  StatusBadge,
  TagBadge,
  WarrantyBadge,
} from '@/components/ui/Primitives';
import { customersApi, ordersApi } from '@/lib/api/endpoints';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { ServiceOrderItemResponse, ServiceOrderResponse } from '@/lib/types/api';
import {
  buildWhatsappDirectUrl,
  formatBRL,
  formatDate,
  maskCpfCnpj,
  maskPhoneBR,
} from '@/lib/utils/masks';
import { getWarrantyRemainingDays } from '@/lib/utils/permissions';

type HistoryFilter = 'ALL' | 'OPEN' | 'DELIVERED' | 'WARRANTY';

export default function CustomerProfilePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);
  const { locale, t } = useI18n();

  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [editOpen, setEditOpen] = useState(false);
  const [warrantyTarget, setWarrantyTarget] = useState<{
    orderId: string;
    item: ServiceOrderItemResponse;
  } | null>(null);

  const customerQuery = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.get(customerId),
  });

  const ordersQuery = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => ordersApi.list({ customerId, page: 0, size: 100 }),
  });

  const customer = customerQuery.data;
  const orders = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data]);

  const stats = useMemo(() => {
    let totalSpent = 0;
    let totalItems = 0;
    const activeWarranties: {
      order: ServiceOrderResponse;
      item: ServiceOrderItemResponse;
      remainingDays: number;
      expiresAt: Date | null;
    }[] = [];

    for (const order of orders) {
      for (const item of order.items) {
        totalItems += 1;
        if (item.status === 'DELIVERED') {
          totalSpent += item.totalPrice;
          const warranty = getWarrantyRemainingDays(item);
          if (warranty.active) {
            activeWarranties.push({
              order,
              item,
              remainingDays: warranty.remainingDays,
              expiresAt: warranty.expiresAt,
            });
          }
        }
      }
    }

    return { totalSpent, totalItems, activeWarranties };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filter === 'ALL') return true;
      if (filter === 'OPEN') {
        return order.items.some(
          (i) => i.status !== 'DELIVERED' && i.status !== 'DISCARDED' && i.status !== 'CANCELLED'
        );
      }
      if (filter === 'DELIVERED') {
        return order.items.some((i) => i.status === 'DELIVERED');
      }
      if (filter === 'WARRANTY') {
        return order.items.some((i) => i.warrantyReturn || getWarrantyRemainingDays(i).active);
      }
      return true;
    });
  }, [orders, filter]);

  if (customerQuery.isLoading) {
    return <Spinner label={t.common.loading} />;
  }

  if (!customer) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-slate-600">{t.common.noResults}</p>
        <Link href="/customers" className="mt-4 inline-block">
          <Button variant="outline">{t.common.back}</Button>
        </Link>
      </Card>
    );
  }

  const waUrl = buildWhatsappDirectUrl(customer.phone);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/customers">
            <Button variant="outline" size="sm" className="mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{customer.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">
                {maskPhoneBR(customer.phone)}
              </span>
              {customer.document && (
                <>
                  <span>·</span>
                  <span className="font-mono">{maskCpfCnpj(customer.document)}</span>
                </>
              )}
              <span>·</span>
              <span>
                {locale === 'en' ? 'Customer since' : 'Cliente desde'}{' '}
                {formatDate(customer.createdAt, locale)}
              </span>
            </div>
            {customer.notes && <p className="mt-1.5 text-xs text-slate-600">{customer.notes}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            {t.common.edit}
          </Button>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="success" size="sm">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
            </a>
          )}
          <Link href={`/orders/new?customerId=${customer.id}`}>
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              {t.nav.newOrder}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            {locale === 'en' ? 'Total Spent' : 'Total Gasto'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatBRL(stats.totalSpent, locale)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            {locale === 'en' ? 'Orders / Appliances' : 'OS / Aparelhos atendidos'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {orders.length} / {stats.totalItems}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            {locale === 'en' ? 'Active Warranties' : 'Garantias Vigentes'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 tabular-nums">
            {stats.activeWarranties.length}
          </p>
        </Card>
      </div>

      {/* Active Warranties Section */}
      {stats.activeWarranties.length > 0 && (
        <Card className="p-5 space-y-3 border-emerald-200 bg-emerald-50/30">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-emerald-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {locale === 'en' ? 'Active Warranties' : 'Garantias Vigentes'}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {stats.activeWarranties.map(({ order, item, remainingDays, expiresAt }) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <TagBadge tag={item.tag} dark={false} />
                    <span className="truncate text-sm font-bold text-slate-900">
                      {item.applianceType} {item.brand}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-800">
                    <strong>{remainingDays}d</strong>{' '}
                    {locale === 'en' ? 'remaining · until' : 'restantes · até'}{' '}
                    {formatDate(expiresAt?.toISOString(), locale)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWarrantyTarget({ orderId: order.id, item })}
                >
                  {locale === 'en' ? 'Return' : 'Retorno'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Order History */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-slate-900">
            {locale === 'en' ? 'Service Order History' : 'Histórico de Ordens de Serviço'}
          </h2>
          <div className="flex gap-1.5">
            {(
              [
                { key: 'ALL', label: t.common.all },
                { key: 'OPEN', label: locale === 'en' ? 'Open' : 'Em aberto' },
                { key: 'DELIVERED', label: locale === 'en' ? 'Delivered' : 'Entregues' },
                { key: 'WARRANTY', label: locale === 'en' ? 'Warranties' : 'Garantias' },
              ] as { key: HistoryFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                  filter === tab.key
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {ordersQuery.isLoading ? (
          <Spinner />
        ) : filteredOrders.length === 0 ? (
          <EmptyState title={t.common.noResults} />
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-mono text-sm font-bold text-blue-600 hover:underline"
                    >
                      OS #{order.orderNumber}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {formatDate(order.createdAt, locale)}
                    </span>
                  </div>
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      {t.common.viewDetails}
                    </Button>
                  </Link>
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/orders/${order.id}?item=${item.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <TagBadge tag={item.tag} dark={false} />
                        <span className="text-sm font-semibold text-slate-900">
                          {item.applianceType} {item.brand}
                        </span>
                        <StatusBadge status={item.status} size="xs" />
                        {item.warrantyReturn && <WarrantyBadge />}
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {item.totalPrice > 0 ? formatBRL(item.totalPrice, locale) : '—'}
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CustomerFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        customer={customer}
      />

      {warrantyTarget && (
        <WarrantyReturnModal
          open={Boolean(warrantyTarget)}
          onClose={() => setWarrantyTarget(null)}
          orderId={warrantyTarget.orderId}
          item={warrantyTarget.item}
        />
      )}
    </div>
  );
}
