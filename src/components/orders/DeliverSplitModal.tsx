'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PenTool, Plus, Trash2 } from 'lucide-react';
import { SignaturePad } from '@/components/orders/SignaturePad';
import { Button, Field, Modal, inputClassName } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { ordersApi, tenantSettingsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { OrderPaymentMethod, ServiceOrderItemResponse } from '@/lib/types/api';
import {
  formatBRL,
  formatCurrencyInput,
  maskCurrencyBRL,
  parseCurrencyBRL,
} from '@/lib/utils/masks';

interface SplitRow {
  id: string;
  paymentMethod: OrderPaymentMethod;
  amountInput: string;
}

const METHODS: OrderPaymentMethod[] = ['PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD'];

function DeliverSplitInner({
  onClose,
  orderId,
  item,
  customerName,
  onDelivered,
}: {
  onClose: () => void;
  orderId: string;
  item: ServiceOrderItemResponse;
  customerName?: string | null;
  onDelivered?: () => void;
}) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantSettingsApi.get(),
    staleTime: 60_000,
  });
  const deliverySignatureEnabled = Boolean(settingsQuery.data?.deliverySignatureEnabled);

  const requiresPayment = item.status === 'READY_FOR_PICKUP' && item.totalPrice > 0;
  const [rows, setRows] = useState<SplitRow[]>(() =>
    requiresPayment
      ? [
          {
            id: 'row-1',
            paymentMethod: 'PIX',
            amountInput: formatCurrencyInput(item.totalPrice),
          },
        ]
      : []
  );
  const [signatureSvg, setSignatureSvg] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(customerName ?? '');

  const paidSum =
    Math.round(rows.reduce((acc, row) => acc + parseCurrencyBRL(row.amountInput), 0) * 100) / 100;
  const remaining = Math.round((item.totalPrice - paidSum) * 100) / 100;
  const canSubmit = !requiresPayment || (rows.length > 0 && Math.abs(remaining) < 0.005);

  function addRow() {
    const used = new Set(rows.map((r) => r.paymentMethod));
    const nextMethod = METHODS.find((m) => !used.has(m)) ?? 'CASH';
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        paymentMethod: nextMethod,
        amountInput: remaining > 0 ? formatCurrencyInput(remaining) : '',
      },
    ]);
  }

  const deliverMutation = useMutation({
    mutationFn: () => {
      const trimmedSigner = signerName.trim();
      const signaturePayload = !deliverySignatureEnabled
        ? {}
        : signatureSvg
          ? {
              deliverySignatureSvg: signatureSvg,
              deliverySignerName: trimmedSigner || undefined,
            }
          : trimmedSigner && trimmedSigner !== (customerName ?? '').trim()
            ? { deliverySignerName: trimmedSigner }
            : {};

      return ordersApi.deliverItem(
        orderId,
        item.id,
        requiresPayment
          ? {
              payments: rows
                .map((r) => ({
                  paymentMethod: r.paymentMethod,
                  amount: parseCurrencyBRL(r.amountInput),
                }))
                .filter((p) => p.amount > 0),
              ...signaturePayload,
            }
          : {
              ...signaturePayload,
            }
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['finance'] }),
        queryClient.invalidateQueries({ queryKey: ['item-payments', item.id] }),
      ]);
      toast.success(
        locale === 'en' ? 'Delivery registered!' : 'Entrega registrada com sucesso!'
      );
      onClose();
      onDelivered?.();
    },
    onError: async (err) => {
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
        toast.warning(t.common.conflictReload, err.message);
        await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      } else {
        toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
      }
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={locale === 'en' ? `Register Delivery · #${item.tag}` : `Registrar Entrega · #${item.tag}`}
      subtitle={`${item.applianceType} ${item.brand}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={deliverMutation.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            variant="success"
            disabled={!canSubmit}
            loading={deliverMutation.isPending}
            onClick={() => deliverMutation.mutate()}
          >
            <CheckCircle2 className="h-4 w-4" />
            {locale === 'en' ? 'Confirm Delivery' : 'Confirmar Entrega'}
          </Button>
        </>
      }
    >
      {!requiresPayment ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {item.status === 'REJECTED'
            ? locale === 'en'
              ? 'This item was rejected by the customer and will be returned at R$ 0.00 with no financial transaction.'
              : 'Este aparelho foi recusado pelo cliente e será devolvido sem cobrança (R$ 0,00), sem lançamento financeiro.'
            : locale === 'en'
              ? 'Covered warranty return (R$ 0.00). No financial transaction will be created.'
              : 'Entrega coberta em garantia (R$ 0,00). Nenhuma receita financeira será gerada.'}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
            <span className="text-xs font-medium text-slate-300">
              {locale === 'en' ? 'Total to receive' : 'Total a receber'}
            </span>
            <span className="font-mono text-xl font-bold tabular-nums">
              {formatBRL(item.totalPrice, locale)}
            </span>
          </div>

          <div className="space-y-2.5">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-6">
                  <Field label={locale === 'en' ? 'Method' : 'Forma'}>
                    <select
                      value={row.paymentMethod}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? { ...r, paymentMethod: e.target.value as OrderPaymentMethod }
                              : r
                          )
                        )
                      }
                      className={inputClassName}
                    >
                      {METHODS.map((method) => (
                        <option key={method} value={method}>
                          {t.orderPaymentMethod[method]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="col-span-5">
                  <Field label="Valor (R$)">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.amountInput}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? { ...r, amountInput: maskCurrencyBRL(e.target.value) }
                              : r
                          )
                        )
                      }
                      className={`${inputClassName} font-mono`}
                    />
                  </Field>
                </div>
                <div className="col-span-1 flex justify-end pb-1">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remover forma"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Split payment' : 'Dividir pagamento'}
            </Button>
            <div className="text-right text-xs">
              {Math.abs(remaining) < 0.005 ? (
                <span className="font-semibold text-emerald-700">
                  {locale === 'en' ? 'Exact total matched' : 'Valor conferido (100%)'}
                </span>
              ) : (
                <span className="font-semibold text-amber-700">
                  {remaining > 0
                    ? `${locale === 'en' ? 'Remaining' : 'Faltam'}: ${formatBRL(remaining, locale)}`
                    : `${locale === 'en' ? 'Excess' : 'Excedente'}: ${formatBRL(Math.abs(remaining), locale)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Digital Pickup Signature (Optional, controlled by shop settings) */}
      {deliverySignatureEnabled && (
        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <PenTool className="h-3.5 w-3.5 text-blue-600" />
            {locale === 'en' ? 'Pickup Signature (Optional)' : 'Assinatura na Retirada (Opcional)'}
          </div>
          <Field label={locale === 'en' ? 'Picked up by' : 'Retirado por'}>
            <input
              type="text"
              maxLength={120}
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={
                locale === 'en' ? 'Name of person picking up' : 'Nome de quem está retirando'
              }
              className={inputClassName}
            />
          </Field>
          <SignaturePad locale={locale} onChange={setSignatureSvg} />
        </div>
      )}
    </Modal>
  );
}

export function DeliverSplitModal({
  open,
  onClose,
  orderId,
  item,
  customerName,
  onDelivered,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  item: ServiceOrderItemResponse;
  customerName?: string | null;
  onDelivered?: () => void;
}) {
  if (!open) return null;
  return (
    <DeliverSplitInner
      key={`${item.id}-${item.totalPrice}`}
      onClose={onClose}
      orderId={orderId}
      item={item}
      customerName={customerName}
      onDelivered={onDelivered}
    />
  );
}
