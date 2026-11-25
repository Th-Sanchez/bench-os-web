'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Spinner,
  inputClassName,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { partsCatalogApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DEFAULT_APPLIANCE_TYPES } from '@/lib/constants/appliances';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { PartCatalogResponse } from '@/lib/types/api';
import {
  formatBRL,
  formatCurrencyInput,
  maskCurrencyBRL,
  parseCurrencyBRL,
} from '@/lib/utils/masks';
import { canManagePartsCatalog } from '@/lib/utils/permissions';

export default function PartsCatalogPage() {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const canWrite = canManagePartsCatalog(session?.user.role);

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

  const parts = partsQuery.data ?? [];
  const previewProfit = parseCurrencyBRL(priceInput) - parseCurrencyBRL(avgCostInput);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.parts}</h1>
          <p className="text-sm text-slate-500">
            {locale === 'en'
              ? 'Standard parts for 1-click quoting and real margin calculation'
              : 'Peças frequentes para orçamento em 1 clique e cálculo de margem real'}
          </p>
        </div>

        {canWrite && (
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
