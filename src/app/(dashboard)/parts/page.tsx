'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ArrivePartRequestModal,
  PartRequestFormModal,
  PartRequestStatusBadge,
} from '@/components/parts/PartRequestModals';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Spinner,
  StatusBadge,
  TagBadge,
  inputClassName,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { partRequestsApi, partsCatalogApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DEFAULT_APPLIANCE_TYPES } from '@/lib/constants/appliances';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type {
  PartCatalogResponse,
  PartRequestResponse,
  PartRequestStatus,
} from '@/lib/types/api';
import {
  formatBRL,
  formatCurrencyInput,
  formatDateTime,
  maskCurrencyBRL,
  parseCurrencyBRL,
} from '@/lib/utils/masks';
import { canManagePartsCatalog } from '@/lib/utils/permissions';

type QueueFilter = 'PENDING' | 'TO_ORDER' | 'ORDERED' | 'ARRIVED';

function PartsPageContent() {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();

  const canWrite = canManagePartsCatalog(session?.user.role);
  const initialTab = searchParams.get('tab') === 'catalog' ? 'catalog' : 'queue';
  const [activeTab, setActiveTab] = useState<'queue' | 'catalog'>(initialTab);

  // --- Shopping Queue State ---
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('PENDING');
  const [queueSearch, setQueueSearch] = useState('');
  const [editingRequest, setEditingRequest] = useState<PartRequestResponse | null>(null);
  const [arrivingRequest, setArrivingRequest] = useState<PartRequestResponse | null>(null);
  const [deleteRequestTarget, setDeleteRequestTarget] = useState<PartRequestResponse | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['part-requests-summary'],
    queryFn: () => partRequestsApi.getSummary(),
  });

  const queueStatuses: PartRequestStatus[] =
    queueFilter === 'PENDING'
      ? ['TO_ORDER', 'ORDERED']
      : [queueFilter];

  const queueQuery = useQuery({
    queryKey: ['part-requests-queue', queueFilter, queueSearch.trim()],
    queryFn: () =>
      partRequestsApi.listQueue({
        status: queueStatuses,
        query: queueSearch.trim() || undefined,
        size: 100,
      }),
    enabled: activeTab === 'queue',
  });

  const markOrderedMutation = useMutation({
    mutationFn: (id: string) => partRequestsApi.markOrdered(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['part-requests-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-summary'] }),
      ]);
      toast.success(locale === 'en' ? 'Marked as ordered' : 'Marcado como pedido feito');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (id: string) => partRequestsApi.reopen(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['part-requests-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-summary'] }),
      ]);
      toast.success(locale === 'en' ? 'Moved back to "To order"' : 'Voltou para "A pedir"');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id: string) => partRequestsApi.remove(id),
    onSuccess: async () => {
      setDeleteRequestTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['part-requests-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-summary'] }),
      ]);
      toast.success(locale === 'en' ? 'Part request removed' : 'Pedido removido');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  // --- Parts Catalog State ---
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PartCatalogResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartCatalogResponse | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [avgCostInput, setAvgCostInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [notes, setNotes] = useState('');

  function openPartModal(part: PartCatalogResponse | null) {
    setEditing(part);
    setName(part?.name ?? '');
    setCategory(part?.applianceCategory ?? '');
    setAvgCostInput(formatCurrencyInput(part?.averageCost));
    setPriceInput(formatCurrencyInput(part?.suggestedPrice));
    setNotes(part?.notes ?? '');
    setModalOpen(true);
  }

  const partsQuery = useQuery({
    queryKey: ['parts-catalog', search.trim(), categoryFilter],
    queryFn: () =>
      partsCatalogApi.list({
        query: search.trim() || undefined,
        category: categoryFilter || undefined,
      }),
    enabled: activeTab === 'catalog',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        applianceCategory: category.trim() || undefined,
        averageCost: parseCurrencyBRL(avgCostInput),
        suggestedPrice: parseCurrencyBRL(priceInput),
        notes: notes.trim() || undefined,
      };
      return editing
        ? partsCatalogApi.update(editing.id, payload)
        : partsCatalogApi.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parts-catalog'] });
      toast.success(locale === 'en' ? 'Part saved' : 'Peça salva no catálogo');
      setModalOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partsCatalogApi.remove(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['parts-catalog'] });
      toast.success(locale === 'en' ? 'Part removed' : 'Peça removida');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => partsCatalogApi.seedDefaults(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parts-catalog'] });
      toast.success(
        locale === 'en'
          ? '10 common parts loaded!'
          : '10 peças comuns carregadas no catálogo!'
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const summary = summaryQuery.data;
  const pendingTotal = (summary?.toOrderCount ?? 0) + (summary?.orderedCount ?? 0);
  const queueItems = queueQuery.data?.content ?? [];
  const parts = partsQuery.data ?? [];
  const previewProfit = parseCurrencyBRL(priceInput) - parseCurrencyBRL(avgCostInput);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.parts}</h1>
          <p className="text-sm text-slate-500">
            {activeTab === 'queue'
              ? locale === 'en'
                ? 'Daily shopping list linked to service orders with 1-click arrival'
                : 'Lista de compras do dia vinculada às OS com baixa em 1 clique'
              : locale === 'en'
                ? 'Standard parts for 1-click quoting and real margin calculation'
                : 'Peças frequentes para orçamento em 1 clique e cálculo de margem real'}
          </p>
        </div>

        {activeTab === 'catalog' && canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={seedMutation.isPending}
              onClick={() => seedMutation.mutate()}
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              {locale === 'en' ? 'Load 10 Common Parts' : 'Carregar 10 peças comuns'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => openPartModal(null)}
            >
              <Plus className="h-4 w-4" />
              {locale === 'en' ? 'New Part' : 'Nova Peça'}
            </Button>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          {locale === 'en' ? 'Shopping Queue' : 'Fila de Compras'}
          {pendingTotal > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {pendingTotal}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'catalog'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="h-4 w-4" />
          {locale === 'en' ? 'Parts Catalog' : 'Catálogo de Peças'}
        </button>
      </div>

      {activeTab === 'queue' ? (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  {locale === 'en' ? 'To Order' : 'A Pedir'}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-900">
                  {summary?.toOrderCount ?? 0}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {locale === 'en' ? 'Est.' : 'Est.'}{' '}
                  {formatBRL(summary?.estimatedToOrderCost ?? 0, locale)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  {locale === 'en' ? 'Ordered (In Transit)' : 'Pedido Feito'}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-900">
                  {summary?.orderedCount ?? 0}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {formatBRL(summary?.estimatedOrderedCost ?? 0, locale)}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {locale === 'en' ? 'Arrived' : 'Chegaram'}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-900">
                  {summary?.arrivedCount ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {locale === 'en' ? 'Completed deliveries' : 'Baixas registradas'}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'PENDING', pt: 'Pendentes', en: 'Pending' },
                  { id: 'TO_ORDER', pt: 'A pedir', en: 'To order' },
                  { id: 'ORDERED', pt: 'Pedido feito', en: 'Ordered' },
                  { id: 'ARRIVED', pt: 'Chegaram', en: 'Arrived' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setQueueFilter(chip.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    queueFilter === chip.id
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {locale === 'en' ? chip.en : chip.pt}
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder={
                  locale === 'en'
                    ? 'Search part, supplier, #OS...'
                    : 'Buscar peça, fornecedor, #OS...'
                }
                className={`${inputClassName} pl-9`}
              />
            </div>
          </div>

          {/* Queue Table */}
          {queueQuery.isLoading ? (
            <Spinner label={t.common.loading} />
          ) : queueItems.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-10 w-10" />}
              title={
                locale === 'en'
                  ? 'No part requests in this view'
                  : 'Nenhum pedido de peça nesta fila'
              }
              description={
                locale === 'en'
                  ? 'Open any service order item to request parts and track purchases here.'
                  : 'Abra qualquer OS e adicione as peças necessárias para acompanhar a lista de compras por aqui.'
              }
              action={
                <Link href="/workbench">
                  <Button variant="outline">
                    {locale === 'en' ? 'Go to Workbench' : 'Ir para Bancada'}
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
                      <th className="px-4 py-3">{locale === 'en' ? 'Part' : 'Peça'}</th>
                      <th className="px-4 py-3">{locale === 'en' ? 'Order / Appliance' : 'OS / Aparelho'}</th>
                      <th className="px-4 py-3">{locale === 'en' ? 'Supplier' : 'Fornecedor'}</th>
                      <th className="px-4 py-3 text-right">{locale === 'en' ? 'Cost' : 'Custo'}</th>
                      <th className="px-4 py-3">{locale === 'en' ? 'Status' : 'Status'}</th>
                      {canWrite && (
                        <th className="px-4 py-3 text-right">{t.common.actions}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {queueItems.map((req) => {
                      const isPending = req.status === 'TO_ORDER' || req.status === 'ORDERED';
                      return (
                        <tr key={req.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {req.quantity > 1 && (
                                <span className="mr-1 font-mono text-blue-700">{req.quantity}x</span>
                              )}
                              {req.partName}
                            </p>
                            {req.notes && (
                              <p className="text-xs text-slate-500">{req.notes}</p>
                            )}
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {req.status === 'ARRIVED' && req.arrivedAt
                                ? `${locale === 'en' ? 'Arrived' : 'Chegou'} ${formatDateTime(req.arrivedAt, locale)}`
                                : formatDateTime(req.createdAt, locale)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/orders/${req.serviceOrderId}?item=${req.serviceOrderItemId}`}
                              className="inline-flex items-center gap-1.5 hover:underline"
                            >
                              <TagBadge tag={req.itemTag} />
                              <span className="text-xs font-semibold text-slate-800">
                                {req.applianceDisplayName}
                              </span>
                            </Link>
                            <div className="mt-1 flex items-center gap-2">
                              <StatusBadge status={req.itemStatus} size="xs" />
                              {req.customerName && (
                                <span className="text-xs text-slate-500">{req.customerName}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-800">
                                {req.supplierName || '—'}
                              </p>
                              {req.purchaseUrl && (
                                <a
                                  href={req.purchaseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                                >
                                  {locale === 'en' ? 'Open link' : 'Abrir link'}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            <p className="font-semibold text-slate-900">
                              {formatBRL(req.effectiveTotalCost, locale)}
                            </p>
                            {req.quantity > 1 && (
                              <p className="text-[11px] text-slate-500">
                                {req.quantity} ×{' '}
                                {formatBRL(req.actualUnitCost ?? req.estimatedUnitCost, locale)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <PartRequestStatusBadge status={req.status} locale={locale} />
                              {req.expenseRecorded && (
                                <span className="text-[10px] font-semibold text-emerald-700">
                                  {locale === 'en' ? 'Finance logged' : 'Despesa lançada'}
                                </span>
                              )}
                            </div>
                          </td>
                          {canWrite && (
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              {isPending ? (
                                <div className="inline-flex items-center gap-1">
                                  {req.status === 'TO_ORDER' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      loading={markOrderedMutation.isPending}
                                      onClick={() => markOrderedMutation.mutate(req.id)}
                                    >
                                      {locale === 'en' ? 'Ordered' : 'Pedido feito'}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title={locale === 'en' ? 'Reopen to To Order' : 'Voltar p/ A pedir'}
                                      loading={reopenMutation.isPending}
                                      onClick={() => reopenMutation.mutate(req.id)}
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => setArrivingRequest(req)}
                                  >
                                    <PackageCheck className="h-3.5 w-3.5" />
                                    {locale === 'en' ? 'Arrived' : 'Chegou'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingRequest(req)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => setDeleteRequestTarget(req)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Link
                                  href={`/orders/${req.serviceOrderId}?item=${req.serviceOrderItemId}`}
                                  className="text-xs font-semibold text-blue-600 hover:underline"
                                >
                                  {locale === 'en' ? 'View OS' : 'Ver OS'}
                                </Link>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* --- Catalog Tab --- */
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === 'en' ? 'Search part name...' : 'Buscar peça...'}
                className={`${inputClassName} pl-9`}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">{locale === 'en' ? 'All categories' : 'Todas as categorias'}</option>
              {DEFAULT_APPLIANCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {partsQuery.isLoading ? (
            <Spinner label={t.common.loading} />
          ) : parts.length === 0 ? (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title={locale === 'en' ? 'No parts registered yet' : 'Nenhuma peça cadastrada ainda'}
              description={
                locale === 'en'
                  ? 'Load the 10 common appliance parts or add your own.'
                  : 'Carregue as 10 peças mais comuns ou adicione suas peças personalizadas.'
              }
              action={
                canWrite ? (
                  <Button loading={seedMutation.isPending} onClick={() => seedMutation.mutate()}>
                    <Sparkles className="h-4 w-4" />
                    {locale === 'en' ? 'Load 10 Common Parts' : 'Carregar 10 peças comuns'}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{locale === 'en' ? 'Part' : 'Peça'}</th>
                      <th className="px-4 py-3">{locale === 'en' ? 'Category' : 'Categoria'}</th>
                      <th className="px-4 py-3 text-right">{locale === 'en' ? 'Avg. Cost' : 'Custo Médio'}</th>
                      <th className="px-4 py-3 text-right">{locale === 'en' ? 'Suggested Price' : 'Preço Repasse'}</th>
                      <th className="px-4 py-3 text-right">{locale === 'en' ? 'Unit Profit' : 'Lucro Unit.'}</th>
                      {canWrite && <th className="px-4 py-3 text-right">{t.common.actions}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parts.map((part) => (
                      <tr key={part.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{part.name}</p>
                          {part.notes && <p className="text-xs text-slate-500">{part.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {part.applianceCategory || 'Geral'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                          {formatBRL(part.averageCost, locale)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatBRL(part.suggestedPrice, locale)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {formatBRL(part.unitProfit, locale)}
                        </td>
                        {canWrite && (
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPartModal(part)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteTarget(part)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Shopping Queue Modals */}
      {editingRequest && (
        <PartRequestFormModal
          open={Boolean(editingRequest)}
          onClose={() => setEditingRequest(null)}
          orderId={editingRequest.serviceOrderId}
          itemId={editingRequest.serviceOrderItemId}
          itemStatus={editingRequest.itemStatus}
          editing={editingRequest}
        />
      )}

      <ArrivePartRequestModal
        request={arrivingRequest}
        onClose={() => setArrivingRequest(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteRequestTarget)}
        onClose={() => setDeleteRequestTarget(null)}
        onConfirm={() => {
          if (deleteRequestTarget) deleteRequestMutation.mutate(deleteRequestTarget.id);
        }}
        danger
        loading={deleteRequestMutation.isPending}
        title={locale === 'en' ? 'Remove part request?' : 'Remover pedido de peça?'}
        description={
          deleteRequestTarget
            ? `${locale === 'en' ? 'Remove' : 'Remover'} "${deleteRequestTarget.partName}" (#${deleteRequestTarget.itemTag})?`
            : ''
        }
      />

      {/* Catalog Modals */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="md"
        title={
          editing
            ? locale === 'en'
              ? 'Edit Part'
              : 'Editar Peça'
            : locale === 'en'
              ? 'New Catalog Part'
              : 'Nova Peça no Catálogo'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={locale === 'en' ? 'Part name' : 'Nome da peça'} required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Magnetron 2M219J, Termostato 160°C..."
              className={inputClassName}
            />
          </Field>
          <Field label={locale === 'en' ? 'Appliance category' : 'Categoria de aparelho'}>
            <input
              list="part-categories-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Micro-ondas, Air Fryer..."
              className={inputClassName}
            />
            <datalist id="part-categories-list">
              {DEFAULT_APPLIANCE_TYPES.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={locale === 'en' ? 'Average cost (R$)' : 'Custo médio (R$)'}>
              <input
                type="text"
                inputMode="numeric"
                value={avgCostInput}
                onChange={(e) => setAvgCostInput(maskCurrencyBRL(e.target.value))}
                placeholder="0,00"
                className={`${inputClassName} font-mono`}
              />
            </Field>
            <Field label={locale === 'en' ? 'Suggested price (R$)' : 'Preço sugerido (R$)'}>
              <input
                type="text"
                inputMode="numeric"
                value={priceInput}
                onChange={(e) => setPriceInput(maskCurrencyBRL(e.target.value))}
                placeholder="0,00"
                className={`${inputClassName} font-mono`}
              />
            </Field>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex justify-between text-xs">
            <span className="font-semibold text-emerald-900">
              {locale === 'en' ? 'Estimated unit profit' : 'Lucro unitário estimado'}
            </span>
            <span className="font-mono font-bold text-emerald-800">
              {formatBRL(previewProfit, locale)}
            </span>
          </div>
          <Field label={locale === 'en' ? 'Notes' : 'Observações'}>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClassName}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        danger
        loading={deleteMutation.isPending}
        title={locale === 'en' ? 'Remove part?' : 'Remover peça?'}
        description={
          deleteTarget
            ? `${locale === 'en' ? 'Remove' : 'Remover'} "${deleteTarget.name}"?`
            : ''
        }
      />
    </div>
  );
}

export default function PartsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PartsPageContent />
    </Suspense>
  );
}
