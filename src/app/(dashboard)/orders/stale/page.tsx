'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, MessageCircle, RefreshCw, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Spinner,
  StatusBadge,
  TagBadge,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { ordersApi, tenantSettingsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { OrderItemQueueResponse } from '@/lib/types/api';
import { buildWhatsappDirectUrl, formatDate } from '@/lib/utils/masks';
import { getWaitingDays } from '@/lib/utils/permissions';

type StaleFilter = 'ALL' | '30' | '90' | 'ELIGIBLE';

export default function StaleOrdersPage() {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<StaleFilter>('ALL');
  const [discardTarget, setDiscardTarget] = useState<OrderItemQueueResponse | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantSettingsApi.get(),
  });

  const waitingQuery = useQuery({
    queryKey: ['bench-queue', 'stale'],
    queryFn: () =>
      ordersApi.listBenchQueue({
        status: ['READY_FOR_PICKUP', 'REJECTED'],
        page: 0,
        size: 100,
      }),
  });

  const eligibleQuery = useQuery({
    queryKey: ['bench-queue', 'abandonment-eligible'],
    queryFn: () => ordersApi.listAbandonmentEligible({ page: 0, size: 100 }),
  });

  const discardMutation = useMutation({
    mutationFn: (item: OrderItemQueueResponse) =>
      ordersApi.transitionStatus(item.serviceOrderId, item.id, { status: 'DISCARDED' }),
    onSuccess: async () => {
      setDiscardTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
      toast.success(
        locale === 'en' ? 'Appliance marked as discarded' : 'Aparelho marcado como descartado'
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const abandonmentDays = settingsQuery.data?.abandonmentDays ?? 180;
  const eligibleIds = useMemo(
    () => new Set((eligibleQuery.data?.content ?? []).map((item) => item.id)),
    [eligibleQuery.data]
  );

  const items = useMemo(() => {
    const base =
      filter === 'ELIGIBLE'
        ? eligibleQuery.data?.content ?? []
        : waitingQuery.data?.content ?? [];

    return base
      .map((item) => ({ item, waitingDays: getWaitingDays(item) }))
      .filter(({ waitingDays }) => {
        if (filter === '30') return waitingDays >= 30;
        if (filter === '90') return waitingDays >= 90;
        return true;
      })
      .sort((a, b) => b.waitingDays - a.waitingDays);
  }, [filter, eligibleQuery.data, waitingQuery.data]);

  function openReminderWhatsapp(item: OrderItemQueueResponse, waitingDays: number) {
    const message =
      locale === 'en'
        ? `Hello ${item.customerName ?? ''}! Your ${item.applianceType} (${item.brand}, tag #${item.tag}) has been ready for pickup for ${waitingDays} days. Please contact us to schedule pickup.`
        : `Olá ${item.customerName ?? ''}! Seu aparelho ${item.applianceType} ${item.brand} (etiqueta #${item.tag}) está aguardando retirada há ${waitingDays} dias em nossa oficina. Entre em contato para combinarmos a retirada.`;
    const url = buildWhatsappDirectUrl(item.customerPhone, message);
    if (!url) {
      toast.warning(locale === 'en' ? 'Customer phone missing' : 'Cliente sem telefone cadastrado');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.stale}</h1>
          <p className="text-sm text-slate-500">
            {locale === 'en'
              ? `Appliances waiting for pickup/return · Abandonment rule: ${abandonmentDays} days`
              : `Aparelhos prontos ou recusados aguardando retirada · Regra de descarte: ${abandonmentDays} dias`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void waitingQuery.refetch();
            void eligibleQuery.refetch();
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.common.refresh}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'ALL', label: locale === 'en' ? 'All waiting' : 'Todos aguardando' },
            { key: '30', label: '+30 dias' },
            { key: '90', label: '+90 dias' },
            {
              key: 'ELIGIBLE',
              label:
                locale === 'en'
                  ? `Discard eligible (${eligibleIds.size})`
                  : `Elegíveis p/ descarte (${eligibleIds.size})`,
            },
          ] as { key: StaleFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === tab.key
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {waitingQuery.isLoading || eligibleQuery.isLoading ? (
        <Spinner label={t.common.loading} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-10 w-10" />}
          title={locale === 'en' ? 'No stale appliances in this filter' : 'Nenhum aparelho parado neste filtro'}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{locale === 'en' ? 'Tag' : 'Etiqueta'}</th>
                  <th className="px-4 py-3">{locale === 'en' ? 'Appliance' : 'Aparelho'}</th>
                  <th className="px-4 py-3">{locale === 'en' ? 'Customer' : 'Cliente'}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">{locale === 'en' ? 'Shelf time' : 'Tempo parado'}</th>
                  <th className="px-4 py-3 text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map(({ item, waitingDays }) => {
                  const isEligible = eligibleIds.has(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/orders/${item.serviceOrderId}?item=${item.id}`}>
                          <TagBadge tag={item.tag} />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {item.applianceType} · {item.brand}
                        </p>
                        <p className="text-xs text-slate-500">
                          {locale === 'en' ? 'Finished' : 'Finalizado em'}:{' '}
                          {formatDate(item.finishedAt ?? item.updatedAt, locale)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.customerName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} size="xs" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                            isEligible
                              ? 'bg-red-100 text-red-800'
                              : waitingDays >= 90
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {waitingDays}d
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReminderWhatsapp(item, waitingDays)}
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            {locale === 'en' ? 'Remind' : 'Cobrar'}
                          </Button>
                          {isEligible && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDiscardTarget(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {locale === 'en' ? 'Discard' : 'Descartar'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(discardTarget)}
        onClose={() => setDiscardTarget(null)}
        onConfirm={() => {
          if (discardTarget) discardMutation.mutate(discardTarget);
        }}
        danger
        loading={discardMutation.isPending}
        title={locale === 'en' ? 'Confirm auditable discard' : 'Confirmar descarte auditável'}
        description={
          discardTarget
            ? locale === 'en'
              ? `Mark #${discardTarget.tag} (${discardTarget.applianceType} ${discardTarget.brand}) as DISCARDED? This keeps full history with zero financial impact.`
              : `Marcar o item #${discardTarget.tag} (${discardTarget.applianceType} ${discardTarget.brand}) como DESCARTADO? O histórico será preservado sem impacto financeiro.`
            : ''
        }
        confirmLabel={locale === 'en' ? 'Mark as Discarded' : 'Confirmar Descarte'}
      />
    </div>
  );
}
