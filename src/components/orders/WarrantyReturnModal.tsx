'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Button, Field, Modal, inputClassName } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { ordersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { ServiceOrderItemResponse } from '@/lib/types/api';
import { formatDate } from '@/lib/utils/masks';
import { getWarrantyRemainingDays } from '@/lib/utils/permissions';

export function WarrantyReturnModal({
  open,
  onClose,
  orderId,
  item,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  item: ServiceOrderItemResponse;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [reportedIssue, setReportedIssue] = useState('');
  const [accessories, setAccessories] = useState(item.accessories ?? '');
  const [notes, setNotes] = useState('');

  const warranty = getWarrantyRemainingDays(item);

  const mutation = useMutation({
    mutationFn: () =>
      ordersApi.openWarrantyReturn(orderId, item.id, {
        reportedIssue: reportedIssue.trim(),
        accessories: accessories.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async (newOrder) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
      toast.success(
        locale === 'en'
          ? `Warranty return OS #${newOrder.orderNumber} created`
          : `Retorno em garantia OS #${newOrder.orderNumber} aberto!`
      );
      onClose();
      router.push(`/orders/${newOrder.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={locale === 'en' ? `Open Warranty Return · #${item.tag}` : `Abrir Retorno em Garantia · #${item.tag}`}
      subtitle={`${item.applianceType} ${item.brand}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!reportedIssue.trim()}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <ShieldCheck className="h-4 w-4" />
            {locale === 'en' ? 'Open Return Order' : 'Abrir OS de Garantia'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          className={`rounded-xl border p-3.5 text-xs ${
            warranty.active
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {warranty.active ? (
            <p className="font-semibold">
              {locale === 'en'
                ? `Active warranty: ${warranty.remainingDays} of ${item.warrantyDays} days remaining (until ${formatDate(warranty.expiresAt?.toISOString(), locale)}).`
                : `Garantia vigente: ${warranty.remainingDays} de ${item.warrantyDays} dias restantes (até ${formatDate(warranty.expiresAt?.toISOString(), locale)}).`}
            </p>
          ) : (
            <p className="font-semibold">
              {locale === 'en'
                ? 'Warranty expired. You can still open a linked return and quote if out of coverage.'
                : 'Garantia expirada. Você ainda pode abrir o retorno vinculado e orçar normalmente caso não seja coberto.'}
            </p>
          )}
        </div>

        <Field label={locale === 'en' ? 'Issue reported on return' : 'Defeito relatado no retorno'} required>
          <textarea
            rows={3}
            required
            value={reportedIssue}
            onChange={(e) => setReportedIssue(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Describe what happened again...'
                : 'Ex.: Voltou a parar de aquecer após 15 dias...'
            }
            className={inputClassName}
          />
        </Field>

        <Field label={locale === 'en' ? 'Accessories brought back' : 'Acessórios entregues'}>
          <input
            type="text"
            value={accessories}
            onChange={(e) => setAccessories(e.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label={locale === 'en' ? 'Internal notes' : 'Observações da OS'}>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClassName}
          />
        </Field>
      </div>
    </Modal>
  );
}
