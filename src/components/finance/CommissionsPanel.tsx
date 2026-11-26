'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  Coins,
  Percent,
  Users,
  Wallet,
} from 'lucide-react';
import { Button, Card, EmptyState, Modal, Spinner, TagBadge } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { financeApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type {
  CommissionBasis,
  MonthlyCommissionReportResponse,
  OrderPaymentMethod,
  TechnicianCommissionRow,
} from '@/lib/types/api';
import { formatBRL, formatDate } from '@/lib/utils/masks';

const PAYMENT_METHODS: OrderPaymentMethod[] = ['PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD'];

function basisLabel(basis: CommissionBasis, locale: string): string {
  if (locale === 'en') {
    switch (basis) {
      case 'LABOR_ONLY':
        return 'Labor only';
      case 'TOTAL_PRICE':
        return 'Total price';
      case 'NET_PROFIT':
        return 'Net profit (rev − parts)';
    }
  }
  switch (basis) {
    case 'LABOR_ONLY':
      return 'Sobre mão de obra';
    case 'TOTAL_PRICE':
      return 'Sobre valor total';
    case 'NET_PROFIT':
      return 'Sobre lucro líquido';
  }
}

export function CommissionsPanel({
  report,
  loading,
  monthLabel,
}: {
  report: MonthlyCommissionReportResponse | undefined;
  loading: boolean;
  monthLabel: string;
}) {
  const { locale, t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [expandedTechIds, setExpandedTechIds] = useState<Record<string, boolean>>({});
  const [payTarget, setPayTarget] = useState<TechnicianCommissionRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>('PIX');

  const recordPayoutMutation = useMutation({
    mutationFn: () => {
      if (!payTarget) throw new Error('Missing target');
      return financeApi.createTransaction({
        type: 'EXPENSE',
        category: 'OPERATIONAL_EXPENSE',
        description:
          locale === 'en'
            ? `Technician commission - ${payTarget.technicianName} (${monthLabel})`
            : `Comissão técnico - ${payTarget.technicianName} (${monthLabel})`,
        amount: payTarget.commissionTotal,
        paymentMethod,
        status: 'PAID',
      });
    },
    onSuccess: async () => {
      setPayTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(
        locale === 'en'
          ? 'Commission payout logged as expense!'
          : 'Pagamento de comissão lançado no caixa!'
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t.common.errorGeneric);
    },
  });

  if (loading && !report) {
    return <Spinner label={t.common.loading} />;
  }

  if (!report) {
    return null;
  }

  function toggleExpand(id: string) {
    setExpandedTechIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-5">
      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'Total Commissions' : 'Total de Comissões'}</span>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {formatBRL(report.totalCommissionAmount, locale)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'Commissionable Revenue' : 'Receita c/ Técnico'}</span>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatBRL(report.totalCommissionableRevenue, locale)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'Delivered Repairs' : 'Reparos Entregues'}</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {report.deliveredWithTechnicianCount}
          </p>
          {report.deliveredUnassignedCount > 0 && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              + {report.deliveredUnassignedCount}{' '}
              {locale === 'en' ? 'unassigned' : 'sem técnico atribuído'}
            </p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'Calculation Basis' : 'Base de Cálculo'}</span>
            <Percent className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-1.5 font-display text-base font-bold text-slate-900">
            {basisLabel(report.commissionBasis, locale)}
          </p>
          <Link href="/settings" className="mt-1 inline-block text-[11px] font-semibold text-blue-600 hover:underline">
            {locale === 'en' ? 'Configure in Settings' : 'Alterar em Ajustes'}
          </Link>
        </Card>
      </div>

      {/* Per-Technician Breakdown */}
      {report.technicians.length === 0 ? (
        <EmptyState
          icon={<Users className="h-9 w-9" />}
          title={
            locale === 'en'
              ? 'No technician commissions in this period'
              : 'Nenhuma comissão registrada neste mês'
          }
          description={
            locale === 'en'
              ? 'Assign a technician on service order items before delivery to calculate monthly commissions automatically.'
              : 'Atribua um técnico responsável nos itens da OS antes da entrega para apurar as comissões automaticamente.'
          }
        />
      ) : (
        <div className="space-y-3">
          {report.technicians.map((row) => {
            const expanded = Boolean(expandedTechIds[row.technicianId]);
            return (
              <Card key={row.technicianId} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => toggleExpand(row.technicianId)}
                    className="flex items-center gap-3 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold text-slate-900">
                          {row.technicianName}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {locale === 'en' ? 'Default' : 'Padrão'}: {row.defaultCommissionPercent.toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {row.deliveredItemsCount}{' '}
                        {locale === 'en' ? 'repairs' : 'reparo(s)'} ·{' '}
                        {locale === 'en' ? 'Labor' : 'Mão de obra'}:{' '}
                        <strong className="font-mono text-slate-700">
                          {formatBRL(row.totalLabor, locale)}
                        </strong>{' '}
                        · {locale === 'en' ? 'Revenue' : 'Total'}:{' '}
                        <strong className="font-mono text-slate-700">
                          {formatBRL(row.totalRevenue, locale)}
                        </strong>
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {locale === 'en' ? 'Commission' : 'Comissão'}
                      </p>
                      <p className="font-mono text-lg font-bold text-emerald-700 tabular-nums">
                        {formatBRL(row.commissionTotal, locale)}
                      </p>
                    </div>
                    {row.commissionTotal > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPaymentMethod('PIX');
                          setPayTarget(row);
                        }}
                      >
                        <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                        {locale === 'en' ? 'Log Payout' : 'Lançar Pagamento'}
                      </Button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">OS / Aparelho</th>
                          <th className="px-4 py-2.5">{locale === 'en' ? 'Delivered' : 'Entrega'}</th>
                          <th className="px-4 py-2.5 text-right">{locale === 'en' ? 'Labor' : 'Mão de obra'}</th>
                          <th className="px-4 py-2.5 text-right">Total</th>
                          <th className="px-4 py-2.5 text-right">%</th>
                          <th className="px-4 py-2.5 text-right">{locale === 'en' ? 'Commission' : 'Comissão'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {row.items.map((item) => (
                          <tr key={item.itemId} className="hover:bg-white">
                            <td className="px-4 py-2.5">
                              <Link
                                href={`/orders/${item.serviceOrderId}?item=${item.itemId}`}
                                className="inline-flex items-center gap-1.5 hover:underline"
                              >
                                <TagBadge tag={item.itemTag} />
                                <span className="font-semibold text-slate-800">
                                  {item.applianceDisplayName}
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">
                              {formatDate(item.deliveredAt, locale)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                              {formatBRL(item.laborCost, locale)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-900 font-semibold">
                              {formatBRL(item.totalPrice, locale)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                              {item.commissionPercent.toFixed(1)}%
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                              {formatBRL(item.commissionAmount, locale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Payout Expense Modal */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        size="sm"
        title={locale === 'en' ? 'Log Commission Payout' : 'Lançar Pagamento de Comissão'}
        footer={
          <>
            <Button variant="outline" onClick={() => setPayTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="success"
              loading={recordPayoutMutation.isPending}
              onClick={() => recordPayoutMutation.mutate()}
            >
              {locale === 'en' ? 'Confirm Expense' : 'Confirmar Saída no Caixa'}
            </Button>
          </>
        }
      >
        {payTarget && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs space-y-1">
              <p className="font-bold text-slate-900">{payTarget.technicianName}</p>
              <p className="text-slate-600 capitalize">{monthLabel}</p>
              <p className="font-mono text-xl font-bold text-emerald-800">
                {formatBRL(payTarget.commissionTotal, locale)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                {locale === 'en' ? 'Payment method' : 'Forma de pagamento'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      paymentMethod === pm
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t.paymentMethod[pm]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
