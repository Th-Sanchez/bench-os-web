'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';
import {
  Button,
  Card,
  Field,
  Spinner,
  inputClassName,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { customersApi, ordersApi, tenantSettingsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { mergeApplianceTypes } from '@/lib/constants/appliances';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { CustomerResponse, Voltage } from '@/lib/types/api';
import { maskPhoneBR } from '@/lib/utils/masks';

interface DraftItem {
  id: string;
  applianceType: string;
  brand: string;
  model: string;
  voltage: Voltage;
  serialNumber: string;
  accessories: string;
  reportedIssue: string;
}

const VOLTAGES: Voltage[] = ['V110', 'V220', 'BIVOLT', 'BATTERY', 'UNKNOWN'];

function createEmptyItem(): DraftItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    applianceType: 'Micro-ondas',
    brand: '',
    model: '',
    voltage: 'V110',
    serialNumber: '',
    accessories: '',
    reportedIssue: '',
  };
}

function NewOrderFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [customerSearch, setCustomerSearch] = useState('');
  const [pickedCustomer, setPickedCustomer] = useState<CustomerResponse | null>(null);
  const [preselectionCleared, setPreselectionCleared] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([createEmptyItem()]);

  const settingsQuery = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantSettingsApi.get(),
  });

  const customersQuery = useQuery({
    queryKey: ['customers', customerSearch.trim()],
    queryFn: () => customersApi.search(customerSearch.trim() || undefined),
  });

  const preselectedQuery = useQuery({
    queryKey: ['customer', preselectedCustomerId],
    queryFn: () => customersApi.get(preselectedCustomerId!),
    enabled: Boolean(preselectedCustomerId) && !pickedCustomer && !preselectionCleared,
  });

  const selectedCustomer =
    pickedCustomer ?? (preselectionCleared ? null : preselectedQuery.data ?? null);

  function setSelectedCustomer(customer: CustomerResponse | null) {
    if (customer === null) {
      setPickedCustomer(null);
      setPreselectionCleared(true);
    } else {
      setPickedCustomer(customer);
      setPreselectionCleared(false);
    }
  }

  const applianceTypes = useMemo(
    () => mergeApplianceTypes(settingsQuery.data?.customApplianceTypes),
    [settingsQuery.data]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      ordersApi.create({
        customerId: selectedCustomer!.id,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          applianceType: item.applianceType.trim(),
          brand: item.brand.trim(),
          model: item.model.trim() || undefined,
          voltage: item.voltage,
          serialNumber: item.serialNumber.trim() || undefined,
          accessories: item.accessories.trim() || undefined,
          reportedIssue: item.reportedIssue.trim(),
        })),
      }),
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bench-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
      toast.success(
        locale === 'en'
          ? `Order #${created.orderNumber} created!`
          : `OS #${created.orderNumber} aberta com sucesso!`
      );
      router.push(`/orders/${created.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedCustomer) {
      toast.warning(
        locale === 'en' ? 'Select a customer first' : 'Selecione ou cadastre um cliente primeiro'
      );
      return;
    }
    const invalid = items.some(
      (i) => !i.applianceType.trim() || !i.brand.trim() || !i.reportedIssue.trim()
    );
    if (invalid) {
      toast.warning(
        locale === 'en'
          ? 'Fill appliance type, brand and reported issue for every item'
          : 'Preencha tipo, marca e defeito relatado em todos os aparelhos'
      );
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.newOrder}</h1>
            <p className="text-sm text-slate-500">
              {locale === 'en'
                ? 'Select customer and add one or more appliances to the order'
                : 'Selecione o cliente e adicione um ou mais aparelhos na notinha'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Customer Selection + Order Notes */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-slate-900">
                1. {locale === 'en' ? 'Customer' : 'Cliente'}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setCustomerModalOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                {locale === 'en' ? 'New' : 'Novo'}
              </Button>
            </div>

            {selectedCustomer ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedCustomer.name}</p>
                    <p className="font-mono text-xs text-slate-600">
                      {maskPhoneBR(selectedCustomer.phone)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    {locale === 'en' ? 'Change' : 'Trocar'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={
                      locale === 'en'
                        ? 'Search by name or phone...'
                        : 'Buscar por nome ou telefone...'
                    }
                    className={`${inputClassName} pl-9`}
                  />
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {customersQuery.isLoading ? (
                    <Spinner />
                  ) : (customersQuery.data ?? []).length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">{t.common.noResults}</p>
                  ) : (
                    (customersQuery.data ?? []).slice(0, 12).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomer(c)}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-blue-400 hover:bg-blue-50/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">{c.name}</p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {maskPhoneBR(c.phone)}
                          </p>
                        </div>
                        <Check className="h-4 w-4 text-slate-300" />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            <Field label={locale === 'en' ? 'Order notes (optional)' : 'Observações gerais da nota'}>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  locale === 'en'
                    ? 'Urgency, customer request, intake remarks...'
                    : 'Urgência, recados do balcão ou observações...'
                }
                className={inputClassName}
              />
            </Field>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
              <span>{locale === 'en' ? 'Appliances in this order' : 'Aparelhos na OS'}</span>
              <span className="font-mono font-bold text-slate-900">{items.length}</span>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={createMutation.isPending}
              disabled={!selectedCustomer}
              className="w-full"
            >
              {locale === 'en' ? 'Create Service Order' : 'Abrir Ordem de Serviço'}
            </Button>
          </Card>
        </div>

        {/* Right Column: Multi-Appliance Builder */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900">
              2. {locale === 'en' ? 'Appliances' : 'Aparelhos da Notinha'} ({items.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems((prev) => [...prev, createEmptyItem()])}
            >
              <Plus className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Add Appliance' : 'Adicionar Aparelho'}
            </Button>
          </div>

          {items.map((item, idx) => (
            <Card key={item.id} className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="inline-flex items-center gap-2 font-mono text-xs font-bold text-slate-900">
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-white">
                    #{idx + 1}
                  </span>
                  {item.applianceType || (locale === 'en' ? 'Appliance' : 'Aparelho')}
                </span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t.common.remove}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <Field label={locale === 'en' ? 'Appliance type' : 'Tipo de aparelho'} required>
                  <input
                    list="appliance-types-list"
                    required
                    value={item.applianceType}
                    onChange={(e) => updateItem(item.id, { applianceType: e.target.value })}
                    placeholder="Micro-ondas"
                    className={inputClassName}
                  />
                </Field>
                <Field label={locale === 'en' ? 'Brand' : 'Marca'} required>
                  <input
                    type="text"
                    required
                    value={item.brand}
                    onChange={(e) => updateItem(item.id, { brand: e.target.value })}
                    placeholder="Electrolux, Mondial..."
                    className={inputClassName}
                  />
                </Field>
                <Field label={locale === 'en' ? 'Model' : 'Modelo'}>
                  <input
                    type="text"
                    value={item.model}
                    onChange={(e) => updateItem(item.id, { model: e.target.value })}
                    placeholder="MEF41 / AF-30"
                    className={inputClassName}
                  />
                </Field>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-700">
                  {locale === 'en' ? 'Voltage' : 'Voltagem'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {VOLTAGES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateItem(item.id, { voltage: v })}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
                        item.voltage === v
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.voltage[v]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label={locale === 'en' ? 'Accessories' : 'Acessórios deixados'}>
                  <input
                    type="text"
                    value={item.accessories}
                    onChange={(e) => updateItem(item.id, { accessories: e.target.value })}
                    placeholder={
                      locale === 'en'
                        ? 'Glass plate, basket, power cord...'
                        : 'Prato de vidro, cesto, cabo...'
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label={locale === 'en' ? 'Serial number' : 'Número de série'}>
                  <input
                    type="text"
                    value={item.serialNumber}
                    onChange={(e) => updateItem(item.id, { serialNumber: e.target.value })}
                    placeholder={t.common.optional}
                    className={`${inputClassName} font-mono`}
                  />
                </Field>
              </div>

              <Field label={locale === 'en' ? 'Reported issue' : 'Defeito relatado pelo cliente'} required>
                <textarea
                  rows={2}
                  required
                  value={item.reportedIssue}
                  onChange={(e) => updateItem(item.id, { reportedIssue: e.target.value })}
                  placeholder={
                    locale === 'en'
                      ? 'Turns on, rotates plate, does not heat...'
                      : 'Liga, gira o prato, mas não esquenta...'
                  }
                  className={inputClassName}
                />
              </Field>
            </Card>
          ))}

          <datalist id="appliance-types-list">
            {applianceTypes.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </div>
      </form>

      <CustomerFormModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSaved={(saved) => setSelectedCustomer(saved)}
      />
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewOrderFormInner />
    </Suspense>
  );
}
