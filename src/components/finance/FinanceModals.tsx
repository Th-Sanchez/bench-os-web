'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Drawer,
  Field,
  Modal,
  Spinner,
  inputClassName,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { financeApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type {
  FinancialTransactionResponse,
  SupplierResponse,
  TransactionCategory,
  TransactionPaymentMethod,
  TransactionType,
} from '@/lib/types/api';
import {
  formatBRL,
  maskCurrencyBRL,
  maskPhoneBR,
  parseCurrencyBRL,
  unmaskDigits,
} from '@/lib/utils/masks';
import { formatTransactionDescription } from '@/lib/utils/transactionDescription';

function TransactionFormInner({ onClose }: { onClose: () => void }) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState<TransactionCategory>('PARTS_PURCHASE');
  const [paymentMethod, setPaymentMethod] = useState<TransactionPaymentMethod>('PIX');
  const [supplierId, setSupplierId] = useState('');
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueDate, setDueDate] = useState('');

  const suppliersQuery = useQuery({
    queryKey: ['finance', 'suppliers'],
    queryFn: () => financeApi.listSuppliers(),
  });

  const isStoreCredit = paymentMethod === 'STORE_CREDIT';

  const mutation = useMutation({
    mutationFn: () =>
      financeApi.createTransaction({
        type,
        category,
        description: description.trim(),
        amount: parseCurrencyBRL(amountInput),
        paymentMethod,
        supplierId: supplierId || undefined,
        status: isStoreCredit ? 'PENDING' : 'PAID',
        dueDate: dueDate || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(locale === 'en' ? 'Transaction saved' : 'Lançamento registrado');
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const canSave =
    description.trim().length > 0 &&
    parseCurrencyBRL(amountInput) > 0 &&
    (!isStoreCredit || Boolean(supplierId));

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={locale === 'en' ? 'New Financial Transaction' : 'Novo Lançamento Financeiro'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!canSave}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t.common.save}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setType('EXPENSE');
              setCategory('PARTS_PURCHASE');
            }}
            className={`rounded-lg border py-2 text-xs font-bold ${
              type === 'EXPENSE'
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {locale === 'en' ? 'Expense (Out)' : 'Despesa (Saída)'}
          </button>
          <button
            type="button"
            onClick={() => {
              setType('INCOME');
              setCategory('OTHER');
              if (paymentMethod === 'STORE_CREDIT') setPaymentMethod('PIX');
            }}
            className={`rounded-lg border py-2 text-xs font-bold ${
              type === 'INCOME'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {locale === 'en' ? 'Income (In)' : 'Receita (Entrada)'}
          </button>
        </div>

        <Field label={locale === 'en' ? 'Description' : 'Descrição'} required>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Magnetron purchase, energy bill...'
                : 'Compra de magnetrons, conta de luz...'
            }
            className={inputClassName}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" required>
            <input
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => setAmountInput(maskCurrencyBRL(e.target.value))}
              placeholder="0,00"
              className={`${inputClassName} font-mono`}
            />
          </Field>

          <Field label={locale === 'en' ? 'Category' : 'Categoria'}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className={inputClassName}
            >
              {(['PARTS_PURCHASE', 'OPERATIONAL_EXPENSE', 'REPAIR_PAYMENT', 'OTHER'] as TransactionCategory[]).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {t.category[cat]}
                  </option>
                )
              )}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={locale === 'en' ? 'Payment method' : 'Forma de pagamento'}>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as TransactionPaymentMethod)}
              className={inputClassName}
            >
              {(
                ['PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD', ...(type === 'EXPENSE' ? ['STORE_CREDIT'] : [])] as TransactionPaymentMethod[]
              ).map((m) => (
                <option key={m} value={m}>
                  {t.paymentMethod[m]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={locale === 'en' ? 'Supplier' : 'Fornecedor'}
            required={isStoreCredit}
          >
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputClassName}
            >
              <option value="">{locale === 'en' ? 'None' : 'Nenhum'}</option>
              {(suppliersQuery.data ?? []).map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {isStoreCredit && (
          <Field
            label={locale === 'en' ? 'Due date (store credit)' : 'Data de vencimento (fiado)'}
          >
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${inputClassName} font-mono`}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}

export function TransactionFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <TransactionFormInner onClose={onClose} />;
}

export function PayTransactionModal({
  transaction,
  onClose,
}: {
  transaction: FinancialTransactionResponse | null;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<TransactionPaymentMethod>('PIX');

  const mutation = useMutation({
    mutationFn: () => financeApi.payTransaction(transaction!.id, method),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(locale === 'en' ? 'Marked as paid' : 'Conta quitada com sucesso!');
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  return (
    <Modal
      open={Boolean(transaction)}
      onClose={onClose}
      size="sm"
      title={locale === 'en' ? 'Settle Payable' : 'Dar Baixa em Conta Pendente'}
      subtitle={transaction ? formatTransactionDescription(transaction.description, locale) : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t.common.cancel}
          </Button>
          <Button variant="success" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {locale === 'en' ? 'Confirm Payment' : 'Confirmar Quitação'}
          </Button>
        </>
      }
    >
      {transaction && (
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-900 p-3.5 text-white flex items-center justify-between">
            <span className="text-xs text-slate-300">
              {transaction.supplierName ?? 'Fornecedor'}
            </span>
            <span className="font-mono text-lg font-bold">
              {formatBRL(transaction.amount, locale)}
            </span>
          </div>
          <Field label={locale === 'en' ? 'Paid via' : 'Forma de pagamento na quitação'}>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as TransactionPaymentMethod)}
              className={inputClassName}
            >
              {(['PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD'] as TransactionPaymentMethod[]).map(
                (m) => (
                  <option key={m} value={m}>
                    {t.paymentMethod[m]}
                  </option>
                )
              )}
            </select>
          </Field>
        </div>
      )}
    </Modal>
  );
}

export function SuppliersDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<SupplierResponse | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const suppliersQuery = useQuery({
    queryKey: ['finance', 'suppliers'],
    queryFn: () => financeApi.listSuppliers(),
    enabled: open,
  });

  function resetForm() {
    setEditing(null);
    setName('');
    setPhone('');
    setNotes('');
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        phone: unmaskDigits(phone) || undefined,
        notes: notes.trim() || undefined,
      };
      return editing
        ? financeApi.updateSupplier(editing.id, payload)
        : financeApi.createSupplier(payload);
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['finance', 'suppliers'] });
      toast.success(locale === 'en' ? 'Supplier saved' : 'Fornecedor salvo');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteSupplier(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance', 'suppliers'] });
      toast.success(locale === 'en' ? 'Supplier removed' : 'Fornecedor removido');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={locale === 'en' ? 'Parts Suppliers' : 'Fornecedores de Peças'}
      subtitle={
        locale === 'en'
          ? 'Used for parts purchases and store credit payables'
          : 'Utilizados em compras de peças e lançamentos no fiado'
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {editing
              ? locale === 'en'
                ? 'Edit Supplier'
                : 'Editar Fornecedor'
              : locale === 'en'
                ? 'Add Supplier'
                : 'Novo Fornecedor'}
          </p>
          <Field label={locale === 'en' ? 'Name' : 'Nome'} required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Distribuidora EletroPeças"
              className={inputClassName}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={locale === 'en' ? 'Phone' : 'Telefone'}>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                placeholder="(11) 99999-9999"
                className={`${inputClassName} font-mono`}
              />
            </Field>
            <Field label={locale === 'en' ? 'Notes' : 'Obs.'}>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            {editing && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                {t.common.cancel}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              disabled={!name.trim()}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Plus className="h-3.5 w-3.5" />
              {editing ? t.common.save : locale === 'en' ? 'Add' : 'Cadastrar'}
            </Button>
          </div>
        </div>

        {suppliersQuery.isLoading ? (
          <Spinner />
        ) : (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {(suppliersQuery.data ?? []).map((sup) => (
              <div key={sup.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{sup.name}</p>
                  <p className="font-mono text-xs text-slate-500">
                    {sup.phone ? maskPhoneBR(sup.phone) : '—'}
                    {sup.notes ? ` · ${sup.notes}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(sup);
                      setName(sup.name);
                      setPhone(sup.phone ? maskPhoneBR(sup.phone) : '');
                      setNotes(sup.notes ?? '');
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(sup.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {(suppliersQuery.data ?? []).length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">{t.common.noResults}</p>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
