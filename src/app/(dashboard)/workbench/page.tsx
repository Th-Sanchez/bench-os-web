'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  Columns3,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Wrench,
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
import { useToast } from '@/components/ui/ToastProvider';
import { ItemQuickDrawer } from '@/components/workbench/ItemQuickDrawer';
import { ordersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  ACTIVE_BENCH_STATUSES,
  ITEM_STATUS_STYLES,
  KANBAN_STATUSES,
} from '@/lib/constants/statusStyles';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { ItemStatus, OrderItemQueueResponse } from '@/lib/types/api';
import { formatBRL, formatDate } from '@/lib/utils/masks';
import {
  canTransitionToStatus,
  getValidNextStatuses,
  getWaitingDays,
  isOverdueEstimatedDate,
} from '@/lib/utils/permissions';

async function fetchActiveBenchItems(): Promise<OrderItemQueueResponse[]> {
  const firstPage = await ordersApi.listBenchQueue({
    status: ACTIVE_BENCH_STATUSES,
    page: 0,
    size: 100,
  });
  const items = [...firstPage.content];
  if (firstPage.totalPages > 1) {
    const restPages = await Promise.all(
      Array.from({ length: Math.min(firstPage.totalPages - 1, 4) }, (_, idx) =>
        ordersApi.listBenchQueue({
          status: ACTIVE_BENCH_STATUSES,
          page: idx + 1,
          size: 100,
        })
      )
    );
    for (const page of restPages) {
      items.push(...page.content);
    }
  }
  return items;
}

export default function WorkbenchPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'ALL'>('ALL');
  const [selectedItem, setSelectedItem] = useState<OrderItemQueueResponse | null>(null);
  const [draggingItem, setDraggingItem] = useState<OrderItemQueueResponse | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ItemStatus | null>(null);

  const benchQuery = useQuery({
    queryKey: ['bench-queue', 'active'],
    queryFn: fetchActiveBenchItems,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ item, targetStatus }: { item: OrderItemQueueResponse; targetStatus: ItemStatus }) =>
      ordersApi.transitionStatus(item.serviceOrderId, item.id, { status: targetStatus }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['bench-queue'] });
      toast.success(
        `#${variables.item.tag} → ${t.status[variables.targetStatus]}`
      );
    },
    onError: async (err) => {
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
        toast.warning(t.common.conflictReload, err.message);
        await queryClient.invalidateQueries({ queryKey: ['bench-queue'] });
      } else {
        toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
      }
    },
  });

  const allItems = useMemo(() => benchQuery.data ?? [], [benchQuery.data]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, '');
    return allItems.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.tag.toLowerCase().includes(q) ||
        String(item.orderNumber).includes(q) ||
        (item.customerName ?? '').toLowerCase().includes(q) ||
        item.applianceType.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.model ?? '').toLowerCase().includes(q)
      );
    });
  }, [allItems, search, statusFilter]);

  const countsByStatus = useMemo(() => {
    const map = new Map<ItemStatus, number>();
    for (const status of KANBAN_STATUSES) map.set(status, 0);
    for (const item of allItems) {
      map.set(item.status, (map.get(item.status) ?? 0) + 1);
    }
    return map;
  }, [allItems]);

  const staleCount = useMemo(
    () =>
      allItems.filter(
        (item) =>
          (item.status === 'READY_FOR_PICKUP' || item.status === 'REJECTED') &&
          getWaitingDays(item) >= 30
      ).length,
    [allItems]
  );

  const overdueCount = useMemo(
    () =>
      allItems.filter(
        (item) =>
          item.status !== 'READY_FOR_PICKUP' &&
          item.status !== 'REJECTED' &&
          isOverdueEstimatedDate(item.estimatedCompletionDate)
      ).length,
    [allItems]
  );

  function handleDropOnColumn(targetStatus: ItemStatus) {
    setDragOverColumn(null);
    if (!draggingItem || draggingItem.status === targetStatus) {
      setDraggingItem(null);
      return;
    }

    const item = draggingItem;
    setDraggingItem(null);

    if (!canTransitionToStatus(session?.user.role, targetStatus)) {
      toast.warning(
        locale === 'en' ? 'Permission required' : 'Sem permissão',
        locale === 'en'
          ? 'Your role cannot move items to this technical stage.'
          : 'Seu perfil não pode mover itens para esta etapa técnica.'
      );
      return;
    }

    const validNext = getValidNextStatuses(item.status, {
      warrantyReturn: item.warrantyReturn,
      totalPrice: item.totalPrice,
    });

    if (!validNext.includes(targetStatus)) {
      toast.warning(
        locale === 'en' ? 'Invalid stage transition' : 'Transição não permitida',
        `${t.status[item.status]} → ${t.status[targetStatus]}`
      );
      return;
    }

    if (targetStatus === 'QUOTE_SENT' && item.totalPrice === 0) {
      toast.info(
        locale === 'en' ? 'Fill quote before sending' : 'Preencha o orçamento',
        locale === 'en'
          ? 'Opening order detail to fill labor, parts and diagnosis.'
          : 'Abrindo a OS para preencher diagnóstico e valores.'
      );
      router.push(`/orders/${item.serviceOrderId}?item=${item.id}&action=quote`);
      return;
    }

    transitionMutation.mutate({ item, targetStatus });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.workbench}</h1>
          <p className="text-sm text-slate-500">
            {locale === 'en'
              ? `${allItems.length} active appliances on the bench`
              : `${allItems.length} aparelhos ativos na bancada`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {staleCount > 0 && (
            <Link href="/orders/stale">
              <Button variant="outline" size="sm" className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100">
                <Archive className="h-3.5 w-3.5" />
                {staleCount} {locale === 'en' ? 'stale (+30d)' : 'parados (+30d)'}
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void benchQuery.refetch()}
            loading={benchQuery.isFetching}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.common.refresh}
          </Button>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'table'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Table' : 'Tabela'}
            </button>
          </div>
          <Link href="/orders/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              {t.nav.newOrder}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            {locale === 'en' ? 'Active Bench' : 'Na Bancada'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {allItems.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            {locale === 'en' ? 'Awaiting Quote Approval' : 'Aguardando Aprovação'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-600 tabular-nums">
            {countsByStatus.get('QUOTE_SENT') ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            {locale === 'en' ? 'Ready for Pickup' : 'Prontos p/ Retirada'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 tabular-nums">
            {countsByStatus.get('READY_FOR_PICKUP') ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">
            {locale === 'en' ? 'Past Due Date' : 'Prazo Estourado'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-600 tabular-nums">
            {overdueCount}
          </p>
        </Card>
      </div>

      {/* Search + Status filter chips */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Filter by tag, customer, appliance, brand...'
                : 'Filtrar por etiqueta, cliente, aparelho, marca...'
            }
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {viewMode === 'table' && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                statusFilter === 'ALL'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.common.all} ({allItems.length})
            </button>
            {KANBAN_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  statusFilter === status
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.status[status]} ({countsByStatus.get(status) ?? 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      {benchQuery.isLoading ? (
        <Spinner label={t.common.loading} />
      ) : benchQuery.isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
          title={t.common.errorGeneric}
          action={
            <Button onClick={() => void benchQuery.refetch()}>{t.common.retry}</Button>
          }
        />
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-10 w-10" />}
          title={locale === 'en' ? 'Workbench is empty' : 'Bancada vazia no momento'}
          description={
            locale === 'en'
              ? 'Create a new service order to start tracking repairs.'
              : 'Abra uma nova Ordem de Serviço para começar a gerenciar os reparos.'
          }
          action={
            <Link href="/orders/new">
              <Button>
                <Plus className="h-4 w-4" />
                {t.nav.newOrder}
              </Button>
            </Link>
          }
        />
      ) : viewMode === 'kanban' ? (
        <div className="bench-scrollbar flex gap-3.5 overflow-x-auto pb-4">
          {KANBAN_STATUSES.map((status) => {
            const columnItems = filteredItems.filter((item) => item.status === status);
            const style = ITEM_STATUS_STYLES[status];
            const isDropTarget = dragOverColumn === status;

            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumn !== status) setDragOverColumn(status);
                }}
                onDragLeave={() => {
                  if (dragOverColumn === status) setDragOverColumn(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnColumn(status);
                }}
                className={`flex w-72 shrink-0 flex-col rounded-xl border border-t-4 bg-slate-100/75 transition-colors ${style.columnAccent} ${
                  isDropTarget ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-400/40' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                      {t.status[status]}
                    </h2>
                  </div>
                  <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-700 shadow-2xs">
                    {columnItems.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 px-2.5 pb-3 min-h-[220px]">
                  {columnItems.map((item) => {
                    const overdue =
                      status !== 'READY_FOR_PICKUP' &&
                      status !== 'REJECTED' &&
                      isOverdueEstimatedDate(item.estimatedCompletionDate);

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDraggingItem(item)}
                        onDragEnd={() => {
                          setDraggingItem(null);
                          setDragOverColumn(null);
                        }}
                        onClick={() => setSelectedItem(item)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-blue-300 hover:shadow-sm active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <TagBadge tag={item.tag} />
                            {item.warrantyReturn && <WarrantyBadge />}
                          </div>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                            {t.voltage[item.voltage]}
                          </span>
                        </div>

                        <p className="mt-2.5 text-sm font-bold text-slate-900 leading-snug">
                          {item.applianceType}{' '}
                          <span className="font-medium text-slate-600">{item.brand}</span>
                        </p>
                        {item.model && (
                          <p className="text-xs text-slate-500 truncate">{item.model}</p>
                        )}
                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                          {item.reportedIssue}
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                          <span className="truncate font-medium text-slate-600 max-w-[130px]">
                            {item.customerName ?? '—'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {item.totalPrice > 0 ? formatBRL(item.totalPrice, locale) : '—'}
                          </span>
                        </div>

                        {overdue && item.estimatedCompletionDate && (
                          <div className="mt-2 flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            {locale === 'en' ? 'Due' : 'Prazo'}:{' '}
                            {formatDate(item.estimatedCompletionDate, locale)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {columnItems.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300/70 text-xs text-slate-400">
                      {locale === 'en' ? 'Drop item here' : 'Sem aparelhos'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
                  <th className="px-4 py-3">{locale === 'en' ? 'Due Date' : 'Previsão'}</th>
                  <th className="px-4 py-3 text-right">{locale === 'en' ? 'Total' : 'Valor'}</th>
                  <th className="px-4 py-3 text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <TagBadge tag={item.tag} />
                        {item.warrantyReturn && <WarrantyBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {item.applianceType} · {item.brand}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.reportedIssue}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.customerName ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={item.status} size="xs" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {item.estimatedCompletionDate ? (
                        <span
                          className={
                            isOverdueEstimatedDate(item.estimatedCompletionDate)
                              ? 'font-bold text-red-600'
                              : 'text-slate-600'
                          }
                        >
                          {formatDate(item.estimatedCompletionDate, locale)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {item.totalPrice > 0 ? formatBRL(item.totalPrice, locale) : '—'}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/orders/${item.serviceOrderId}?item=${item.id}`}>
                        <Button variant="outline" size="sm">
                          {t.common.viewDetails}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ItemQuickDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
