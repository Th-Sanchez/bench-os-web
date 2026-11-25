'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Calendar,
  ExternalLink,
  MessageCircle,
  User,
  Wrench,
} from 'lucide-react';
import {
  Button,
  Drawer,
  Spinner,
  StatusBadge,
  TagBadge,
  WarrantyBadge,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { ordersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { ItemStatus, OrderItemQueueResponse } from '@/lib/types/api';
import { formatBRL, formatDate, maskPhoneBR } from '@/lib/utils/masks';
import {
  canDeliverItem,
  canTransitionToStatus,
  getValidNextStatuses,
  isOverdueEstimatedDate,
} from '@/lib/utils/permissions';

export function ItemQuickDrawer({
  item,
  onClose,
}: {
  item: OrderItemQueueResponse | null;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [waLoading, setWaLoading] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['order', item?.serviceOrderId],
    queryFn: () => ordersApi.get(item!.serviceOrderId),
    enabled: Boolean(item),
  });

  const fullItem = orderQuery.data?.items.find((i) => i.id === item?.id);
  const role = session?.user.role;

  const transitionMutation = useMutation({
    mutationFn: (targetStatus: ItemStatus) =>
      ordersApi.transitionStatus(item!.serviceOrderId, item!.id, { status: targetStatus }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['order', item?.serviceOrderId] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
      toast.success(locale === 'en' ? 'Status updated' : 'Status atualizado');
    },
    onError: async (err) => {
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
        toast.warning(t.common.conflictReload, err.message);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
          queryClient.invalidateQueries({ queryKey: ['order', item?.serviceOrderId] }),
        ]);
      } else {
        toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
      }
    },
  });

  async function handleOpenWhatsapp() {
    if (!item) return;
    setWaLoading(true);
    try {
      const link = await ordersApi.getOrderWhatsappLink(item.serviceOrderId);
      window.open(link.whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    } finally {
      setWaLoading(false);
    }
  }

  const currentStatus = fullItem?.status ?? item?.status;
  const nextStatuses = currentStatus
    ? getValidNextStatuses(currentStatus, {
        warrantyReturn: fullItem?.warrantyReturn ?? item?.warrantyReturn,
        totalPrice: fullItem?.totalPrice ?? item?.totalPrice,
      }).filter(
        (target) =>
          target !== 'DELIVERED' &&
          target !== 'DISCARDED' &&
          target !== 'CANCELLED' &&
          canTransitionToStatus(role, target)
      )
    : [];

  return (
    <Drawer
      open={Boolean(item)}
      onClose={onClose}
      title={item ? `${item.applianceType} · ${item.brand}` : ''}
      subtitle={item ? `OS #${item.orderNumber} · ${item.model ?? t.voltage[item.voltage]}` : undefined}
    >
      {!item ? null : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TagBadge tag={item.tag} />
              {currentStatus && <StatusBadge status={currentStatus} />}
              {(fullItem?.warrantyReturn ?? item.warrantyReturn) && <WarrantyBadge />}
            </div>
            <Link href={`/orders/${item.serviceOrderId}?item=${item.id}`}>
              <Button variant="outline" size="sm">
                {t.common.viewDetails}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <User className="h-4 w-4 text-slate-400" />
                <Link
                  href={`/customers/${item.customerId}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {item.customerName ?? 'Cliente'}
                </Link>
              </div>
              {item.customerPhone && (
                <span className="font-mono text-xs text-slate-600">
                  {maskPhoneBR(item.customerPhone)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>{t.voltage[item.voltage]}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {locale === 'en' ? 'Intake' : 'Entrada'}: {formatDate(item.createdAt, locale)}
              </span>
              {item.estimatedCompletionDate && (
                <>
                  <span>·</span>
                  <span
                    className={
                      isOverdueEstimatedDate(item.estimatedCompletionDate)
                        ? 'font-semibold text-red-600'
                        : 'text-slate-600'
                    }
                  >
                    {locale === 'en' ? 'Due' : 'Previsão'}:{' '}
                    {formatDate(item.estimatedCompletionDate, locale)}
                  </span>
                </>
              )}
            </div>
          </div>

          {orderQuery.isLoading ? (
            <Spinner />
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {locale === 'en' ? 'Reported issue' : 'Defeito relatado'}
                  </p>
                  <p className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
                    {fullItem?.reportedIssue ?? item.reportedIssue}
                  </p>
                </div>

                {fullItem?.technicalDiagnosis && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {locale === 'en' ? 'Technical diagnosis' : 'Diagnóstico técnico'}
                    </p>
                    <p className="mt-1 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-800">
                      {fullItem.technicalDiagnosis}
                    </p>
                  </div>
                )}

                {fullItem?.accessories && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {locale === 'en' ? 'Accessories' : 'Acessórios'}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{fullItem.accessories}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {locale === 'en' ? 'Quoted total' : 'Valor do orçamento'}
                  </span>
                  <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                    {formatBRL(fullItem?.totalPrice ?? item.totalPrice, locale)}
                  </span>
                </div>
                {fullItem && (
                  <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                    <div>
                      <span>{locale === 'en' ? 'Labor' : 'Mão de obra'}</span>
                      <p className="font-mono font-semibold text-slate-700">
                        {formatBRL(fullItem.laborCost, locale)}
                      </p>
                    </div>
                    <div>
                      <span>{locale === 'en' ? 'Parts' : 'Peças'}</span>
                      <p className="font-mono font-semibold text-slate-700">
                        {formatBRL(fullItem.partsCost, locale)}
                      </p>
                    </div>
                    <div>
                      <span>{locale === 'en' ? 'Discount' : 'Desconto'}</span>
                      <p className="font-mono font-semibold text-slate-700">
                        {formatBRL(fullItem.discount, locale)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {nextStatuses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {locale === 'en' ? 'Quick stage move' : 'Avançar etapa na bancada'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((target) => (
                      <Button
                        key={target}
                        variant={target === 'READY_FOR_PICKUP' ? 'success' : 'outline'}
                        size="sm"
                        loading={transitionMutation.isPending}
                        onClick={() => transitionMutation.mutate(target)}
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        {t.status[target]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <Button
                  variant="success"
                  size="md"
                  loading={waLoading}
                  onClick={handleOpenWhatsapp}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Link
                  href={`/orders/${item.serviceOrderId}?item=${item.id}`}
                  className="flex-1"
                >
                  <Button variant="primary" size="md" className="w-full">
                    {currentStatus && canDeliverItem(currentStatus)
                      ? locale === 'en'
                        ? 'Deliver & Receive'
                        : 'Entregar / Receber'
                      : locale === 'en'
                        ? 'Open Full Order'
                        : 'Abrir OS Completa'}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </Drawer>
  );
}
