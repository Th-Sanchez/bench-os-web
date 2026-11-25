'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Sparkles, X } from 'lucide-react';
import { Button, Field, Modal, inputClassName } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { ordersApi, partsCatalogApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { PartCatalogResponse, ServiceOrderItemResponse } from '@/lib/types/api';
import {
  formatBRL,
  formatCurrencyInput,
  maskCurrencyBRL,
  maskInteger,
  parseCurrencyBRL,
} from '@/lib/utils/masks';
import {
  appendPartToDiagnosis,
  classifyPartForAppliance,
  removePartFromDiagnosis,
} from '@/lib/utils/quoteDiagnosis';

function QuoteEditInner({
  onClose,
  orderId,
  item,
  defaultLaborCost,
}: {
  onClose: () => void;
  orderId: string;
  item: ServiceOrderItemResponse;
  defaultLaborCost: number;
}) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [diagnosis, setDiagnosis] = useState(item.technicalDiagnosis ?? '');
  const [laborInput, setLaborInput] = useState(
    formatCurrencyInput(item.laborCost > 0 ? item.laborCost : defaultLaborCost)
  );
  const [partsInput, setPartsInput] = useState(formatCurrencyInput(item.partsCost));
  const [actualPartsInput, setActualPartsInput] = useState(
    formatCurrencyInput(item.partsCostActual)
  );
  const [discountInput, setDiscountInput] = useState(formatCurrencyInput(item.discount));
  const [warrantyDays, setWarrantyDays] = useState(String(item.warrantyDays || 90));
  const [appliedParts, setAppliedParts] = useState<PartCatalogResponse[]>([]);
  const [showAllParts, setShowAllParts] = useState(false);

  const partsQuery = useQuery({
    queryKey: ['parts-catalog'],
    queryFn: () => partsCatalogApi.list(),
  });

  const { matchingParts, allPartsSorted } = useMemo(() => {
    const list = partsQuery.data ?? [];
    const rank = (kind: 'exact' | 'universal' | 'other') =>
      kind === 'exact' ? 0 : kind === 'universal' ? 1 : 2;

    const annotated = list.map((part) => ({
      part,
      kind: classifyPartForAppliance(part, item.applianceType),
    }));

    annotated.sort((a, b) => {
      const diff = rank(a.kind) - rank(b.kind);
      if (diff !== 0) return diff;
      return a.part.name.localeCompare(b.part.name);
    });

    return {
      matchingParts: annotated
        .filter((entry) => entry.kind !== 'other')
        .map((entry) => entry.part),
      allPartsSorted: annotated.map((entry) => entry.part),
    };
  }, [partsQuery.data, item.applianceType]);

  const displayedParts = showAllParts ? allPartsSorted : matchingParts;
  const hiddenOtherCount = Math.max(0, allPartsSorted.length - matchingParts.length);
  const diagnosisPrefix = locale === 'pt-BR' ? 'Troca de' : 'Replace';

  function handleApplyPart(part: PartCatalogResponse) {
    const currentParts = parseCurrencyBRL(partsInput);
    const currentActual = parseCurrencyBRL(actualPartsInput);
    const nextParts = Math.max(0, Math.round((currentParts + Number(part.suggestedPrice)) * 100) / 100);
    const nextActual = Math.max(0, Math.round((currentActual + Number(part.averageCost)) * 100) / 100);

    setPartsInput(formatCurrencyInput(nextParts));
    setActualPartsInput(formatCurrencyInput(nextActual));
    setAppliedParts((prev) => [...prev, part]);
    setDiagnosis((prev) => appendPartToDiagnosis(prev, part.name, diagnosisPrefix));
  }

  function handleRemoveAppliedPart(indexToRemove: number) {
    const removed = appliedParts[indexToRemove];
    if (!removed) return;

    const nextApplied = appliedParts.filter((_, idx) => idx !== indexToRemove);
    const currentParts = parseCurrencyBRL(partsInput);
    const currentActual = parseCurrencyBRL(actualPartsInput);
    const nextParts = Math.max(0, Math.round((currentParts - Number(removed.suggestedPrice)) * 100) / 100);
    const nextActual = Math.max(0, Math.round((currentActual - Number(removed.averageCost)) * 100) / 100);

    setPartsInput(formatCurrencyInput(nextParts));
    setActualPartsInput(formatCurrencyInput(nextActual));
    setAppliedParts(nextApplied);

    const stillHasSamePart = nextApplied.some(
      (part) => part.name.trim().toLowerCase() === removed.name.trim().toLowerCase()
    );
    if (!stillHasSamePart) {
      setDiagnosis((prev) => removePartFromDiagnosis(prev, removed.name, diagnosisPrefix));
    }
  }

  const labor = parseCurrencyBRL(laborInput);
  const parts = parseCurrencyBRL(partsInput);
  const actualParts = parseCurrencyBRL(actualPartsInput);
  const discount = parseCurrencyBRL(discountInput);
  const total = Math.max(0, Math.round((labor + parts - discount) * 100) / 100);
  const netProfit = Math.round((total - actualParts) * 100) / 100;
  const marginPct = total > 0 ? Math.round((netProfit / total) * 1000) / 10 : 0;

  const saveMutation = useMutation({
    mutationFn: () =>
      ordersApi.updateQuote(orderId, item.id, {
        technicalDiagnosis: diagnosis.trim() || undefined,
        laborCost: labor,
        partsCost: parts,
        partsCostActual: actualParts,
        discount,
        warrantyDays: Number.parseInt(warrantyDays, 10) || 90,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
      toast.success(locale === 'en' ? 'Quote saved' : 'Orçamento salvo');
      onClose();
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
      size="lg"
      title={locale === 'en' ? `Edit Quote · #${item.tag}` : `Orçamento e Diagnóstico · #${item.tag}`}
      subtitle={`${item.applianceType} ${item.brand} ${item.model ?? ''}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {allPartsSorted.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Package className="h-3.5 w-3.5 text-blue-600" />
                {showAllParts
                  ? locale === 'en'
                    ? 'All Common Parts (1-click)'
                    : 'Todas as Peças Comuns (1 clique)'
                  : locale === 'en'
                    ? `Parts · ${item.applianceType}`
                    : `Peças · ${item.applianceType}`}
              </p>
              {(hiddenOtherCount > 0 || showAllParts) && (
                <button
                  type="button"
                  onClick={() => setShowAllParts((prev) => !prev)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  {showAllParts
                    ? locale === 'en'
                      ? `Only ${item.applianceType}`
                      : `Só ${item.applianceType}`
                    : locale === 'en'
                      ? `Show all (${allPartsSorted.length})`
                      : `Ver todas (${allPartsSorted.length})`}
                </button>
              )}
            </div>

            {displayedParts.length === 0 ? (
              <p className="text-xs text-slate-500">
                {locale === 'en'
                  ? `No parts linked to ${item.applianceType}.`
                  : `Nenhuma peça vinculada a ${item.applianceType}.`}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {displayedParts.map((part) => {
                  const isExact = classifyPartForAppliance(part, item.applianceType) === 'exact';
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => handleApplyPart(part)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isExact
                          ? 'border-blue-200 bg-blue-50/70 text-slate-800 hover:border-blue-400 hover:bg-blue-100/70'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <Plus className="h-3 w-3 text-blue-600" />
                      {part.name}{' '}
                      <span className="font-mono text-blue-700">
                        {formatBRL(part.suggestedPrice, locale)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {appliedParts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-slate-200 pt-2">
                {appliedParts.map((part, idx) => (
                  <span
                    key={`${part.id}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                  >
                    {part.name} ({formatBRL(part.suggestedPrice, locale)})
                    <button
                      type="button"
                      onClick={() => handleRemoveAppliedPart(idx)}
                      className="rounded-full p-0.5 text-blue-600 hover:bg-blue-200/70 hover:text-blue-900"
                      aria-label={`Remover ${part.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <Field label={locale === 'en' ? 'Technical diagnosis' : 'Diagnóstico técnico'}>
          <textarea
            rows={3}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Describe fault found and parts to replace...'
                : 'Descreva o defeito encontrado e o reparo necessário...'
            }
            className={inputClassName}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={locale === 'en' ? 'Labor cost (R$)' : 'Mão de obra (R$)'}>
            <input
              type="text"
              inputMode="numeric"
              value={laborInput}
              onChange={(e) => setLaborInput(maskCurrencyBRL(e.target.value))}
              placeholder="0,00"
              className={`${inputClassName} font-mono`}
            />
          </Field>
          <Field label={locale === 'en' ? 'Parts charged to customer (R$)' : 'Peças cobradas do cliente (R$)'}>
            <input
              type="text"
              inputMode="numeric"
              value={partsInput}
              onChange={(e) => setPartsInput(maskCurrencyBRL(e.target.value))}
              placeholder="0,00"
              className={`${inputClassName} font-mono`}
            />
          </Field>
          <Field
            label={locale === 'en' ? 'Actual internal parts cost (R$)' : 'Custo real das peças (interno · R$)'}
            hint={locale === 'en' ? 'Hidden from customer receipt & /track' : 'Oculto do cliente e do /track'}
          >
            <input
              type="text"
              inputMode="numeric"
              value={actualPartsInput}
              onChange={(e) => setActualPartsInput(maskCurrencyBRL(e.target.value))}
              placeholder="0,00"
              className={`${inputClassName} font-mono`}
            />
          </Field>
          <Field label={locale === 'en' ? 'Discount (R$)' : 'Desconto (R$)'}>
            <input
              type="text"
              inputMode="numeric"
              value={discountInput}
              onChange={(e) => setDiscountInput(maskCurrencyBRL(e.target.value))}
              placeholder="0,00"
              className={`${inputClassName} font-mono`}
            />
          </Field>
        </div>

        <Field label={locale === 'en' ? 'Warranty (days)' : 'Garantia (dias)'}>
          <input
            type="text"
            inputMode="numeric"
            value={warrantyDays}
            onChange={(e) => setWarrantyDays(maskInteger(e.target.value, 3))}
            className={`${inputClassName} font-mono max-w-[140px]`}
          />
        </Field>

        <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              {locale === 'en' ? 'Total Quote to Customer' : 'Total do Orçamento ao Cliente'}
            </span>
            <span className="font-mono text-xl font-bold tabular-nums">
              {formatBRL(total, locale)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-700 pt-2.5 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Estimated net profit (internal)' : 'Lucro líquido estimado (interno)'}
            </span>
            <span className="font-mono font-bold text-emerald-300 tabular-nums">
              {formatBRL(netProfit, locale)} ({marginPct}%)
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function QuoteEditModal({
  open,
  onClose,
  orderId,
  item,
  defaultLaborCost = 0,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  item: ServiceOrderItemResponse;
  defaultLaborCost?: number;
}) {
  if (!open) return null;
  return (
    <QuoteEditInner
      key={`${item.id}-${item.updatedAt}`}
      onClose={onClose}
      orderId={orderId}
      item={item}
      defaultLaborCost={defaultLaborCost}
    />
  );
}
