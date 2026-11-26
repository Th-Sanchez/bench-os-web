'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import {
  ArrivePartRequestModal,
  PartRequestFormModal,
  PartRequestStatusBadge,
} from '@/components/parts/PartRequestModals';
import { Button, Card, ConfirmDialog, Spinner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { partRequestsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { PartRequestResponse, ServiceOrderItemResponse } from '@/lib/types/api';
import { formatBRL } from '@/lib/utils/masks';
import { canManagePartsCatalog } from '@/lib/utils/permissions';

interface ItemPartRequestsCardProps {
  orderId: string;
  item: ServiceOrderItemResponse;
}

export function ItemPartRequestsCard({ orderId, item }: ItemPartRequestsCardProps) {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const canWrite = canManagePartsCatalog(session?.user.role);
  const isTerminal =
    item.status === 'DELIVERED' || item.status === 'DISCARDED' || item.status === 'CANCELLED';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PartRequestResponse | null>(null);
  const [arriving, setArriving] = useState<PartRequestResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartRequestResponse | null>(null);

  const requestsQuery = useQuery({
    queryKey: ['item-part-requests', orderId, item.id],
    queryFn: () => partRequestsApi.listForItem(orderId, item.id),
  });

  const markOrderedMutation = useMutation({
    mutationFn: (id: string) => partRequestsApi.markOrdered(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-part-requests', orderId, item.id] }),
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
        queryClient.invalidateQueries({ queryKey: ['item-part-requests', orderId, item.id] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-summary'] }),
      ]);
      toast.success(locale === 'en' ? 'Moved back to "To order"' : 'Voltou para "A pedir"');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partRequestsApi.remove(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-part-requests', orderId, item.id] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-summary'] }),
      ]);
      toast.success(locale === 'en' ? 'Part request removed' : 'Pedido removido');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const list = requestsQuery.data ?? [];
  const pendingCount = list.filter((r) => r.status === 'TO_ORDER' || r.status === 'ORDERED').length;

  return (
    <>
      <Card className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
              <ShoppingCart className="h-4 w-4 text-amber-600" />
              {locale === 'en' ? 'Required Parts' : 'Peças Necessárias'}
            </h3>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                {pendingCount} {locale === 'en' ? 'pending' : 'pendente(s)'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/parts"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              {locale === 'en' ? 'Shopping queue' : 'Fila de compras'}
            </Link>
            {canWrite && !isTerminal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {locale === 'en' ? 'Request Part' : 'Pedir Peça'}
              </Button>
            )}
          </div>
        </div>

        {requestsQuery.isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <p className="text-xs text-slate-500">
            {locale === 'en'
              ? 'No parts requested for this appliance yet.'
              : 'Nenhuma peça solicitada para este aparelho.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {list.map((req) => {
              const isPending = req.status === 'TO_ORDER' || req.status === 'ORDERED';
              return (
                <div
                  key={req.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {req.quantity > 1 ? `${req.quantity}x ` : ''}
                          {req.partName}
                        </span>
                        <PartRequestStatusBadge status={req.status} locale={locale} />
                        {req.expenseRecorded && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            {locale === 'en' ? 'Expense logged' : 'Financeiro ✓'}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {req.supplierName && <span>{req.supplierName}</span>}
                        {req.purchaseUrl && (
                          <a
                            href={req.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                          >
                            {locale === 'en' ? 'Buy link' : 'Abrir link'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {req.notes && <span className="italic">{req.notes}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatBRL(req.effectiveTotalCost, locale)}
                      </p>
                      {req.quantity > 1 && (
                        <p className="font-mono text-[10px] text-slate-500">
                          {req.quantity} ×{' '}
                          {formatBRL(req.actualUnitCost ?? req.estimatedUnitCost, locale)}
                        </p>
                      )}
                    </div>
                  </div>

                  {canWrite && isPending && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {req.status === 'TO_ORDER' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            loading={markOrderedMutation.isPending}
                            onClick={() => markOrderedMutation.mutate(req.id)}
                          >
                            <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                            {locale === 'en' ? 'Mark Ordered' : 'Pedido feito'}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={reopenMutation.isPending}
                            onClick={() => reopenMutation.mutate(req.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {locale === 'en' ? 'Back to To Order' : 'Voltar p/ A pedir'}
                          </Button>
                        )}
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => setArriving(req)}
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          {locale === 'en' ? 'Arrived' : 'Chegou'}
                        </Button>
                      </div>

                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(req);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget(req)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <PartRequestFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        orderId={orderId}
        itemId={item.id}
        itemStatus={item.status}
        applianceType={item.applianceType}
        editing={editing}
      />

      <ArrivePartRequestModal
        request={arriving}
        onClose={() => setArriving(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        danger
        loading={deleteMutation.isPending}
        title={locale === 'en' ? 'Remove part request?' : 'Remover pedido de peça?'}
        description={
          deleteTarget
            ? `${locale === 'en' ? 'Remove' : 'Remover'} "${deleteTarget.partName}"?`
            : ''
        }
      />
    </>
  );
}
