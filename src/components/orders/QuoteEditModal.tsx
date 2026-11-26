'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Package, Plus, Sparkles, Star, Trash2, X } from 'lucide-react';
import { Button, Field, Modal, inputClassName } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { ordersApi, partsCatalogApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type {
  PartCatalogResponse,
  QuoteOptionRequest,
  ServiceOrderItemResponse,
} from '@/lib/types/api';
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

interface OptionDraft {
  label: string;
  description: string;
  laborInput: string;
  partsInput: string;
  actualPartsInput: string;
  discountInput: string;
  warrantyDays: string;
  recommended: boolean;
}

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

  const initialOptions: OptionDraft[] = (item.quoteOptions ?? []).map((opt) => ({
    label: opt.label,
    description: opt.description ?? '',
    laborInput: formatCurrencyInput(opt.laborCost),
    partsInput: formatCurrencyInput(opt.partsCost),
    actualPartsInput: formatCurrencyInput(opt.partsCostActual),
    discountInput: formatCurrencyInput(opt.discount),
    warrantyDays: String(opt.warrantyDays || 90),
    recommended: opt.recommended,
  }));
  const [multiOptionMode, setMultiOptionMode] = useState(initialOptions.length > 0);
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>(initialOptions);

  function enableMultiOptionMode() {
    setMultiOptionMode(true);
    if (optionDrafts.length === 0) {
      setOptionDrafts([
        {
          label: locale === 'en' ? 'Original Part' : 'Peça Original',
          description: '',
          laborInput,
          partsInput,
          actualPartsInput,
          discountInput,
          warrantyDays: warrantyDays || '90',
          recommended: true,
        },
        {
          label: locale === 'en' ? 'Aftermarket / Economy' : 'Peça Paralela (Econômica)',
          description: '',
          laborInput,
          partsInput: '',
          actualPartsInput: '',
          discountInput: '',
          warrantyDays: '90',
          recommended: false,
        },
      ]);
    }
  }

  function disableMultiOptionMode() {
    setMultiOptionMode(false);
    setOptionDrafts([]);
  }

  function updateOptionDraft(idx: number, patch: Partial<OptionDraft>) {
    setOptionDrafts((prev) =>
      prev.map((opt, i) => {
        if (patch.recommended === true) {
          return i === idx ? { ...opt, ...patch, recommended: true } : { ...opt, recommended: false };
        }
        return i === idx ? { ...opt, ...patch } : opt;
      })
    );
  }

  function addOptionDraft() {
    if (optionDrafts.length >= 4) return;
    setOptionDrafts((prev) => [
      ...prev,
      {
        label:
          locale === 'en' ? `Option ${prev.length + 1}` : `Opção ${prev.length + 1}`,
        description: '',
        laborInput,
        partsInput: '',
        actualPartsInput: '',
        discountInput: '',
        warrantyDays: '90',
        recommended: prev.length === 0,
      },
    ]);
  }

  function removeOptionDraft(idx: number) {
    setOptionDrafts((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setMultiOptionMode(false);
        return [];
      }
      if (!next.some((o) => o.recommended)) {
        next[0] = { ...next[0], recommended: true };
      }
      return next;
    });
  }

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
    mutationFn: () => {
      let quoteOptionsPayload: QuoteOptionRequest[] = [];
      if (multiOptionMode && optionDrafts.length > 0) {
        quoteOptionsPayload = optionDrafts.map((opt, idx) => ({
          label: opt.label.trim() || (locale === 'en' ? `Option ${idx + 1}` : `Opção ${idx + 1}`),
          description: opt.description.trim() || undefined,
          laborCost: parseCurrencyBRL(opt.laborInput),
          partsCost: parseCurrencyBRL(opt.partsInput),
          partsCostActual: parseCurrencyBRL(opt.actualPartsInput),
          discount: parseCurrencyBRL(opt.discountInput),
          warrantyDays: Number.parseInt(opt.warrantyDays, 10) || 0,
          recommended: opt.recommended,
        }));
      }
      const primaryOpt =
        quoteOptionsPayload.find((o) => o.recommended) ?? quoteOptionsPayload[0];
      return ordersApi.updateQuote(orderId, item.id, {
        technicalDiagnosis: diagnosis.trim() || undefined,
        laborCost: primaryOpt ? primaryOpt.laborCost : labor,
        partsCost: primaryOpt ? primaryOpt.partsCost : parts,
        partsCostActual: primaryOpt ? (primaryOpt.partsCostActual ?? 0) : actualParts,
        discount: primaryOpt ? (primaryOpt.discount ?? 0) : discount,
        warrantyDays: primaryOpt
          ? (primaryOpt.warrantyDays ?? 90)
          : (Number.parseInt(warrantyDays, 10) || 90),
        quoteOptions: quoteOptionsPayload,
      });
    },
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

        {!multiOptionMode ? (
          <>
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

            <div className="flex flex-wrap items-end justify-between gap-3">
              <Field label={locale === 'en' ? 'Warranty (days)' : 'Garantia (dias)'}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(maskInteger(e.target.value, 3))}
                  className={`${inputClassName} font-mono max-w-[140px]`}
                />
              </Field>

              <Button variant="outline" size="sm" onClick={enableMultiOptionMode}>
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                {locale === 'en'
                  ? '+ Offer Multiple Options'
                  : '+ Oferecer Opções (ex.: Original vs. Paralela)'}
              </Button>
            </div>

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
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs text-blue-950">
                <Layers className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">
                  {locale === 'en'
                    ? 'Multiple Quote Options (customer chooses on /track)'
                    : 'Orçamento com Múltiplas Opções (cliente escolhe no /track)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {optionDrafts.length < 4 && (
                  <Button variant="outline" size="sm" onClick={addOptionDraft}>
                    <Plus className="h-3.5 w-3.5" />
                    {locale === 'en' ? 'Add Option' : 'Nova Opção'}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={disableMultiOptionMode}
                  className="text-xs font-semibold text-slate-600 hover:text-red-600"
                >
                  {locale === 'en' ? 'Back to single price' : 'Voltar p/ preço único'}
                </button>
              </div>
            </div>

            {optionDrafts.map((opt, idx) => {
              const oLabor = parseCurrencyBRL(opt.laborInput);
              const oParts = parseCurrencyBRL(opt.partsInput);
              const oActual = parseCurrencyBRL(opt.actualPartsInput);
              const oDiscount = parseCurrencyBRL(opt.discountInput);
              const oTotal = Math.max(0, Math.round((oLabor + oParts - oDiscount) * 100) / 100);
              const oProfit = Math.round((oTotal - oActual) * 100) / 100;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3.5 space-y-3 ${
                    opt.recommended
                      ? 'border-blue-300 bg-blue-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOptionDraft(idx, { recommended: true })}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          opt.recommended
                            ? 'border-blue-300 bg-blue-100 text-blue-800'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Star className={`h-3 w-3 ${opt.recommended ? 'fill-blue-600 text-blue-600' : ''}`} />
                        {opt.recommended
                          ? locale === 'en'
                            ? 'Recommended'
                            : 'Recomendada'
                          : locale === 'en'
                            ? 'Set recommended'
                            : 'Marcar recomendada'}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {formatBRL(oTotal, locale)}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-emerald-700">
                        ({locale === 'en' ? 'Profit' : 'Lucro'}: {formatBRL(oProfit, locale)})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeOptionDraft(idx)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Remover opção"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <Field label={locale === 'en' ? 'Option title' : 'Título da opção'} required>
                      <input
                        type="text"
                        maxLength={120}
                        value={opt.label}
                        onChange={(e) => updateOptionDraft(idx, { label: e.target.value })}
                        placeholder="Ex.: Peça Original"
                        className={inputClassName}
                      />
                    </Field>
                    <Field label={locale === 'en' ? 'Short description (optional)' : 'Detalhes p/ cliente (opcional)'}>
                      <input
                        type="text"
                        maxLength={300}
                        value={opt.description}
                        onChange={(e) => updateOptionDraft(idx, { description: e.target.value })}
                        placeholder="Ex.: Peça genuína com garantia estendida"
                        className={inputClassName}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                    <Field label={locale === 'en' ? 'Labor' : 'Mão obra'}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={opt.laborInput}
                        onChange={(e) =>
                          updateOptionDraft(idx, { laborInput: maskCurrencyBRL(e.target.value) })
                        }
                        placeholder="0,00"
                        className={`${inputClassName} font-mono`}
                      />
                    </Field>
                    <Field label={locale === 'en' ? 'Parts' : 'Peças'}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={opt.partsInput}
                        onChange={(e) =>
                          updateOptionDraft(idx, { partsInput: maskCurrencyBRL(e.target.value) })
                        }
                        placeholder="0,00"
                        className={`${inputClassName} font-mono`}
                      />
                    </Field>
                    <Field label={locale === 'en' ? 'Actual cost' : 'Custo real'}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={opt.actualPartsInput}
                        onChange={(e) =>
                          updateOptionDraft(idx, {
                            actualPartsInput: maskCurrencyBRL(e.target.value),
                          })
                        }
                        placeholder="0,00"
                        className={`${inputClassName} font-mono`}
                      />
                    </Field>
                    <Field label={locale === 'en' ? 'Discount' : 'Desconto'}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={opt.discountInput}
                        onChange={(e) =>
                          updateOptionDraft(idx, {
                            discountInput: maskCurrencyBRL(e.target.value),
                          })
                        }
                        placeholder="0,00"
                        className={`${inputClassName} font-mono`}
                      />
                    </Field>
                    <Field label={locale === 'en' ? 'Warranty (d)' : 'Garantia (d)'}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={opt.warrantyDays}
                        onChange={(e) =>
                          updateOptionDraft(idx, { warrantyDays: maskInteger(e.target.value, 3) })
                        }
                        className={`${inputClassName} font-mono`}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
