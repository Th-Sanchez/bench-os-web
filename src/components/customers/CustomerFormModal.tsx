'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Field, Modal, inputClassName } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { customersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { CustomerResponse } from '@/lib/types/api';
import { maskCpfCnpj, maskPhoneBR, unmaskDigits } from '@/lib/utils/masks';

function CustomerFormInner({
  onClose,
  customer,
  onSaved,
}: {
  onClose: () => void;
  customer?: CustomerResponse | null;
  onSaved?: (saved: CustomerResponse) => void;
}) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ? maskPhoneBR(customer.phone) : '');
  const [document, setDocument] = useState(customer?.document ? maskCpfCnpj(customer.document) : '');
  const [notes, setNotes] = useState(customer?.notes ?? '');

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        phone: unmaskDigits(phone),
        document: unmaskDigits(document) || undefined,
        notes: notes.trim() || undefined,
      };
      return customer ? customersApi.update(customer.id, payload) : customersApi.create(payload);
    },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customer', saved.id] }),
      ]);
      toast.success(
        customer
          ? locale === 'en'
            ? 'Customer updated'
            : 'Cliente atualizado'
          : locale === 'en'
            ? 'Customer created'
            : 'Cliente cadastrado'
      );
      onSaved?.(saved);
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || unmaskDigits(phone).length < 10) {
      toast.warning(
        locale === 'en'
          ? 'Please enter name and valid phone number'
          : 'Informe nome e telefone válido (com DDD)'
      );
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={
        customer
          ? locale === 'en'
            ? 'Edit Customer'
            : 'Editar Cliente'
          : locale === 'en'
            ? 'New Customer'
            : 'Novo Cliente'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || unmaskDigits(phone).length < 10}
          >
            {t.common.save}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={locale === 'en' ? 'Full name' : 'Nome completo'} required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maria Oliveira"
            className={inputClassName}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={locale === 'en' ? 'Phone / WhatsApp' : 'Telefone / WhatsApp'} required>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
              className={`${inputClassName} font-mono`}
            />
          </Field>
          <Field label={`CPF / CNPJ (${t.common.optional})`}>
            <input
              type="text"
              value={document}
              onChange={(e) => setDocument(maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00"
              className={`${inputClassName} font-mono`}
            />
          </Field>
        </div>

        <Field label={locale === 'en' ? 'Notes' : 'Observações'}>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Preferred contact time, address or notes...'
                : 'Referência, horário preferido ou observações...'
            }
            className={inputClassName}
          />
        </Field>
      </form>
    </Modal>
  );
}

export function CustomerFormModal({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer?: CustomerResponse | null;
  onSaved?: (saved: CustomerResponse) => void;
}) {
  if (!open) return null;
  return (
    <CustomerFormInner
      key={customer?.id ?? 'new'}
      onClose={onClose}
      customer={customer}
      onSaved={onSaved}
    />
  );
}
