'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Spinner,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { customersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { CustomerResponse } from '@/lib/types/api';
import { buildWhatsappDirectUrl, formatDate, maskCpfCnpj, maskPhoneBR } from '@/lib/utils/masks';

export default function CustomersPage() {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerResponse | null>(null);

  const customersQuery = useQuery({
    queryKey: ['customers', search.trim()],
    queryFn: () => customersApi.search(search.trim() || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(locale === 'en' ? 'Customer removed' : 'Cliente removido');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  const customers = customersQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.customers}</h1>
          <p className="text-sm text-slate-500">
            {customers.length} {locale === 'en' ? 'registered customers' : 'clientes cadastrados'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" />
          {locale === 'en' ? 'New Customer' : 'Novo Cliente'}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            locale === 'en'
              ? 'Search by name, phone or document...'
              : 'Buscar por nome, telefone ou CPF/CNPJ...'
          }
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {customersQuery.isLoading ? (
        <Spinner label={t.common.loading} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title={t.common.noResults}
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {locale === 'en' ? 'New Customer' : 'Cadastrar Cliente'}
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{locale === 'en' ? 'Name' : 'Nome'}</th>
                  <th className="px-4 py-3">{locale === 'en' ? 'Phone / WhatsApp' : 'Telefone'}</th>
                  <th className="px-4 py-3">CPF / CNPJ</th>
                  <th className="px-4 py-3">{locale === 'en' ? 'Registered' : 'Cadastro'}</th>
                  <th className="px-4 py-3 text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customers.map((customer) => {
                  const waUrl = buildWhatsappDirectUrl(customer.phone);
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {customer.name}
                        </Link>
                        {customer.notes && (
                          <p className="text-xs text-slate-500 line-clamp-1">{customer.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-700">
                        {maskPhoneBR(customer.phone)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-600">
                        {customer.document ? maskCpfCnpj(customer.document) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-500">
                        {formatDate(customer.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-emerald-600 hover:bg-emerald-50"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                          <Link href={`/customers/${customer.id}`}>
                            <Button variant="outline" size="sm">
                              {locale === 'en' ? 'Profile' : 'Ficha'}
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(customer);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(customer)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editing}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        danger
        loading={deleteMutation.isPending}
        title={locale === 'en' ? 'Remove customer?' : 'Remover cliente?'}
        description={
          deleteTarget
            ? locale === 'en'
              ? `Soft-delete "${deleteTarget.name}"? Existing orders will remain preserved.`
              : `Remover "${deleteTarget.name}" da lista ativa? As ordens de serviço antigas serão preservadas.`
            : ''
        }
      />
    </div>
  );
}
