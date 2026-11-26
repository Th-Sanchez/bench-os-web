'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PackageCheck, ShoppingCart } from 'lucide-react';
import { Button, Field, Modal, inputClassName } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { financeApi, partRequestsApi, partsCatalogApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type {
  ItemStatus,
  OrderPaymentMethod,
  PartCatalogResponse,
  PartRequestResponse,
  PartRequestStatus,
} from '@/lib/types/api';
import {
  formatBRL,
  formatCurrencyInput,
  maskCurrencyBRL,
  parseCurrencyBRL,
} from '@/lib/utils/masks';
import { isOwner } from '@/lib/utils/permissions';

export function PartRequestStatusBadge({
  status,
  locale,
}: {
  status: PartRequestStatus;
  locale: string;
}) {
  const styles: Record<PartRequestStatus, string> = {
    TO_ORDER: 'bg-amber-50 text-amber-800 border-amber-200',
    ORDERED: 'bg-blue-50 text-blue-800 border-blue-200',
    ARRIVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const labels: Record<PartRequestStatus, string> =
    locale === 'en'
      ? {
          TO_ORDER: 'To order',
          ORDERED: 'Ordered',
          ARRIVED: 'Arrived',
          CANCELLED: 'Cancelled',
        }
      : {
          TO_ORDER: 'A pedir',
          ORDERED: 'Pedido feito',
          ARRIVED: 'Chegou',
          CANCELLED: 'Cancelado',
        };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

interface PartRequestFormModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  itemId: string;
  itemStatus?: ItemStatus;
  applianceType?: string;
  editing?: PartRequestResponse | null;
}

export function PartRequestFormModal(props: PartRequestFormModalProps) {
  if (!props.open) return null;
  return <PartRequestFormModalContent key={props.editing?.id ?? 'new'} {...props} />;
}

function PartRequestFormModalContent({
  open,
  onClose,
  orderId,
  itemId,
  itemStatus,
  applianceType,
  editing,
}: PartRequestFormModalProps) {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const owner = isOwner(session?.user.role);

  const [partCatalogId, setPartCatalogId] = useState<string>(() => editing?.partCatalogId ?? '');
  const [partName, setPartName] = useState(() => editing?.partName ?? '');
  const [quantity, setQuantity] = useState(() => (editing ? String(editing.quantity) : '1'));
  const [estimatedCostInput, setEstimatedCostInput] = useState(() =>
    editing ? formatCurrencyInput(editing.estimatedUnitCost) : ''
  );
  const [actualCostInput, setActualCostInput] = useState(() =>
    editing?.actualUnitCost != null ? formatCurrencyInput(editing.actualUnitCost) : ''
  );
  const [supplierName, setSupplierName] = useState(() => editing?.supplierName ?? '');
  const [purchaseUrl, setPurchaseUrl] = useState(() => editing?.purchaseUrl ?? '');
  const [notes, setNotes] = useState(() => editing?.notes ?? '');
  const [moveToWaitingParts, setMoveToWaitingParts] = useState(
    () => !editing && (itemStatus === 'APPROVED' || itemStatus === 'IN_REPAIR')
  );

  const canMoveToWaiting =
    !editing && (itemStatus === 'APPROVED' || itemStatus === 'IN_REPAIR');

  const catalogQuery = useQuery({
    queryKey: ['parts-catalog', '', ''],
    queryFn: () => partsCatalogApi.list(),
    enabled: open && !editing,
  });

  const suppliersQuery = useQuery({
    queryKey: ['finance-suppliers-datalist'],
    queryFn: () => financeApi.listSuppliers(),
    enabled: open && owner,
  });

  function handleSelectCatalogPart(id: string) {
    setPartCatalogId(id);
    if (!id) return;
    const found: PartCatalogResponse | undefined = catalogQuery.data?.find((p) => p.id === id);
    if (found) {
      setPartName(found.name);
      setEstimatedCostInput(formatCurrencyInput(found.averageCost));
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const qty = Math.max(1, Math.min(999, Number.parseInt(quantity, 10) || 1));
      const estCost = parseCurrencyBRL(estimatedCostInput);
      const actCost = actualCostInput.trim() ? parseCurrencyBRL(actualCostInput) : undefined;
      if (editing) {
        return partRequestsApi.update(editing.id, {
          partName: partName.trim(),
          quantity: qty,
          estimatedUnitCost: estCost,
          actualUnitCost: actCost,
          supplierName: supplierName.trim() || undefined,
          purchaseUrl: purchaseUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      return partRequestsApi.createForItem(orderId, itemId, {
        partCatalogId: partCatalogId || undefined,
        partName: partName.trim() || undefined,
        quantity: qty,
        estimatedUnitCost: estCost,
        supplierName: supplierName.trim() || undefined,
        purchaseUrl: purchaseUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        moveItemToWaitingParts: canMoveToWaiting ? moveToWaitingParts : false,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item-part-requests', orderId, itemId] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
      ]);
      toast.success(
        editing
          ? locale === 'en'
            ? 'Part request updated'
            : 'Pedido de peça atualizado'
          : locale === 'en'
            ? 'Part added to shopping queue'
            : 'Peça adicionada à fila de compras'
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const sortedCatalog = [...(catalogQuery.data ?? [])].sort((a, b) => {
    if (applianceType) {
      const aMatch = a.applianceCategory?.toLowerCase().includes(applianceType.toLowerCase()) ? 0 : 1;
      const bMatch = b.applianceCategory?.toLowerCase().includes(applianceType.toLowerCase()) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return a.name.localeCompare(b.name);
  });

  const qtyNum = Math.max(1, Number.parseInt(quantity, 10) || 1);
  const estTotal = parseCurrencyBRL(estimatedCostInput) * qtyNum;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        editing
          ? locale === 'en'
            ? 'Edit Part Request'
            : 'Editar Pedido de Peça'
          : locale === 'en'
            ? 'Request Part for Item'
            : 'Pedir Peça para a OS'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!partName.trim() && !partCatalogId}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <ShoppingCart className="h-4 w-4" />
            {editing
              ? t.common.save
              : locale === 'en'
                ? 'Add to Queue'
                : 'Adicionar à Fila'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!editing && sortedCatalog.length > 0 && (
          <Field label={locale === 'en' ? 'Quick pick from catalog (optional)' : 'Selecionar do catálogo (opcional)'}>
            <select
              value={partCatalogId}
              onChange={(e) => handleSelectCatalogPart(e.target.value)}
              className={inputClassName}
            >
              <option value="">
                {locale === 'en' ? '— Custom part (type below) —' : '— Peça avulsa (digitar abaixo) —'}
              </option>
              {sortedCatalog.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name}
                  {part.applianceCategory ? ` (${part.applianceCategory})` : ''} —{' '}
                  {formatBRL(part.averageCost, locale)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label={locale === 'en' ? 'Part name' : 'Nome da peça'} required>
          <input
            type="text"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="Ex.: Magnetron 2M219J, Termostato 160°C..."
            className={inputClassName}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label={locale === 'en' ? 'Qty' : 'Qtd.'} required>
            <input
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`${inputClassName} font-mono`}
            />
          </Field>
          <Field label={locale === 'en' ? 'Est. unit cost (R$)' : 'Custo est. unit. (R$)'}>
            <input
              type="text"
              inputMode="numeric"
              value={estimatedCostInput}
              onChange={(e) => setEstimatedCostInput(maskCurrencyBRL(e.target.value))}
              placeholder="0,00"
              className={`${inputClassName} font-mono`}
            />
          </Field>
          {editing ? (
            <Field label={locale === 'en' ? 'Actual unit cost' : 'Custo real unit.'}>
              <input
                type="text"
                inputMode="numeric"
                value={actualCostInput}
                onChange={(e) => setActualCostInput(maskCurrencyBRL(e.target.value))}
                placeholder="0,00"
                className={`${inputClassName} font-mono`}
              />
            </Field>
          ) : (
            <div className="flex flex-col justify-end">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  {locale === 'en' ? 'Est. total' : 'Total est.'}
                </p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {formatBRL(estTotal, locale)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={locale === 'en' ? 'Supplier (optional)' : 'Fornecedor (opcional)'}>
            <input
              type="text"
              list="part-req-suppliers-list"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Ex.: Mercado Livre, Distribuidora..."
              className={inputClassName}
            />
            {suppliersQuery.data && suppliersQuery.data.length > 0 && (
              <datalist id="part-req-suppliers-list">
                {suppliersQuery.data.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            )}
          </Field>
          <Field label={locale === 'en' ? 'Purchase link (optional)' : 'Link de compra (opcional)'}>
            <input
              type="url"
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              placeholder="https://..."
              className={inputClassName}
            />
          </Field>
        </div>

        <Field label={locale === 'en' ? 'Notes (optional)' : 'Observações (opcional)'}>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Connector type, voltage, part code...'
                : 'Conector, código da peça, referência...'
            }
            className={inputClassName}
          />
        </Field>

        {canMoveToWaiting && (
          <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 cursor-pointer">
            <input
              type="checkbox"
              checked={moveToWaitingParts}
              onChange={(e) => setMoveToWaitingParts(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-400 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <strong className="block font-semibold">
                {locale === 'en'
                  ? 'Move item to "Waiting Parts"'
                  : 'Mover item para "Aguardando Peça"'}
              </strong>
              {locale === 'en'
                ? 'Automatically updates the appliance status on the workbench.'
                : 'Atualiza o status do aparelho automaticamente na bancada.'}
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}

interface ArrivePartRequestModalProps {
  request: PartRequestResponse | null;
  onClose: () => void;
}

const PAYMENT_METHODS: OrderPaymentMethod[] = ['PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'CASH'];

export function ArrivePartRequestModal({ request, onClose }: ArrivePartRequestModalProps) {
  if (!request) return null;
  return <ArrivePartRequestModalContent key={request.id} request={request} onClose={onClose} />;
}

function ArrivePartRequestModalContent({
  request,
  onClose,
}: {
  request: PartRequestResponse;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const owner = isOwner(session?.user.role);

  const baseUnit = request.actualUnitCost ?? request.estimatedUnitCost;
  const [actualUnitCostInput, setActualUnitCostInput] = useState(() =>
    formatCurrencyInput(baseUnit)
  );
  const [addToItemPartsCost, setAddToItemPartsCost] = useState(true);
  const [moveItemToInRepair, setMoveItemToInRepair] = useState(
    () => request.itemStatus === 'WAITING_PARTS'
  );
  const [recordExpense, setRecordExpense] = useState(
    () => owner && baseUnit * request.quantity > 0
  );
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>('PIX');

  const arriveMutation = useMutation({
    mutationFn: () => {
      const unitCost = parseCurrencyBRL(actualUnitCostInput);
      const total = unitCost * request.quantity;
      return partRequestsApi.markArrived(request.id, {
        actualUnitCost: unitCost,
        addToItemPartsCost,
        moveItemToInRepair,
        recordExpense: owner && recordExpense && total > 0,
        paymentMethod: owner && recordExpense && total > 0 ? paymentMethod : undefined,
      });
    },
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['item-part-requests', updated.serviceOrderId, updated.serviceOrderItemId],
        }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['part-requests-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['order', updated.serviceOrderId] }),
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['finance'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-transactions'] }),
      ]);
      toast.success(
        locale === 'en' ? 'Part marked as arrived!' : 'Baixa registrada — peça chegou!',
        updated.itemStatus === 'IN_REPAIR'
          ? locale === 'en'
            ? `#${updated.itemTag} moved to In Repair`
            : `Item #${updated.itemTag} movido para Em Reparo`
          : undefined
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const unitCostNum = parseCurrencyBRL(actualUnitCostInput);
  const totalCostNum = unitCostNum * request.quantity;

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={locale === 'en' ? 'Confirm Part Arrival' : 'Dar Baixa — Peça Chegou'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            variant="success"
            loading={arriveMutation.isPending}
            onClick={() => arriveMutation.mutate()}
          >
            <PackageCheck className="h-4 w-4" />
            {locale === 'en' ? 'Confirm Arrival' : 'Confirmar Chegada'}
          </Button>
        </>
      }
    >
      {request && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900">
                {request.quantity > 1 ? `${request.quantity}x ` : ''}
                {request.partName}
              </span>
              <span className="font-mono font-bold text-slate-700">#{request.itemTag}</span>
            </div>
            <p className="text-slate-600">
              {request.applianceDisplayName}
              {request.customerName ? ` · ${request.customerName}` : ''}
            </p>
            {request.supplierName && (
              <p className="text-slate-500">
                {locale === 'en' ? 'Supplier:' : 'Fornecedor:'} {request.supplierName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={locale === 'en' ? 'Actual unit cost (R$)' : 'Custo real unitário (R$)'}>
              <input
                type="text"
                inputMode="numeric"
                value={actualUnitCostInput}
                onChange={(e) => setActualUnitCostInput(maskCurrencyBRL(e.target.value))}
                placeholder="0,00"
                className={`${inputClassName} font-mono`}
              />
            </Field>
            <div className="flex flex-col justify-end">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase text-emerald-700">
                  {locale === 'en'
                    ? `Total (${request.quantity} un.)`
                    : `Total (${request.quantity} un.)`}
                </p>
                <p className="font-mono text-base font-bold text-emerald-900">
                  {formatBRL(totalCostNum, locale)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs text-slate-800 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={addToItemPartsCost}
                onChange={(e) => setAddToItemPartsCost(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span>
                <strong className="block font-semibold">
                  {locale === 'en'
                    ? 'Add cost to order real margin'
                    : 'Somar no custo real de peças da OS'}
                </strong>
                {locale === 'en'
                  ? 'Updates internal real profit calculation automatically.'
                  : 'Atualiza o custo real das peças e a margem líquida da OS.'}
              </span>
            </label>

            {request.itemStatus === 'WAITING_PARTS' && (
              <label className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moveItemToInRepair}
                  onChange={(e) => setMoveItemToInRepair(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-blue-400 text-blue-600"
                />
                <span>
                  <strong className="block font-semibold">
                    {locale === 'en'
                      ? 'Move item to "In Repair"'
                      : 'Mover item para "Em Reparo"'}
                  </strong>
                  {locale === 'en'
                    ? 'Applies automatically if no other pending parts remain for this item.'
                    : 'Acontece automaticamente quando não restam outras peças pendentes neste aparelho.'}
                </span>
              </label>
            )}

            {owner && totalCostNum > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2.5">
                <label className="flex items-start gap-2.5 text-xs text-emerald-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordExpense}
                    onChange={(e) => setRecordExpense(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600"
                  />
                  <span>
                    <strong className="flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {locale === 'en'
                        ? 'Record expense in Finance (Parts Purchase)'
                        : 'Lançar despesa no Financeiro (Compra de Peças)'}
                    </strong>
                    {locale === 'en'
                      ? `Creates a paid expense of ${formatBRL(totalCostNum, locale)} linked to #${request.itemTag}.`
                      : `Cria saída paga de ${formatBRL(totalCostNum, locale)} vinculada à OS #${request.itemTag}.`}
                  </span>
                </label>

                {recordExpense && (
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPaymentMethod(pm)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          paymentMethod === pm
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50'
                        }`}
                      >
                        {t.paymentMethod[pm]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
