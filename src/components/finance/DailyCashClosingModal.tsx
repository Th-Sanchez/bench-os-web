'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Button, Modal, Spinner } from '@/components/ui/Primitives';
import { financeApi } from '@/lib/api/endpoints';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { DailyCashClosingResponse, TransactionPaymentMethod } from '@/lib/types/api';
import { formatBRL, formatDate, toIsoDate } from '@/lib/utils/masks';
import { formatTransactionDescription } from '@/lib/utils/transactionDescription';

const METHODS: TransactionPaymentMethod[] = ['PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD'];

function shiftDate(iso: string, deltaDays: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + deltaDays);
  return toIsoDate(date);
}

export function DailyCashClosingModal({
  open,
  onClose,
  onPrintClosing,
}: {
  open: boolean;
  onClose: () => void;
  onPrintClosing: (closing: DailyCashClosingResponse) => void;
}) {
  const { locale, t } = useI18n();
  const todayIso = toIsoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const closingQuery = useQuery({
    queryKey: ['finance', 'daily-closing', selectedDate],
    queryFn: () =>
      financeApi.getDailyClosing({
        date: selectedDate,
        zone: 'America/Sao_Paulo',
      }),
    enabled: open,
  });

  const data = closingQuery.data;
  const cashIn = data?.incomeByPaymentMethod?.CASH ?? 0;
  const cashOut = data?.expenseByPaymentMethod?.CASH ?? 0;
  const cashDrawerNet = cashIn - cashOut;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={locale === 'en' ? 'Daily Cash Closing' : 'Fechamento de Caixa do Dia'}
      subtitle="America/Sao_Paulo"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t.common.close}
          </Button>
          <Button
            variant="primary"
            disabled={!data}
            onClick={() => {
              if (data) onPrintClosing(data);
            }}
          >
            <Printer className="h-4 w-4" />
            {locale === 'en' ? 'Print A4 Report' : 'Imprimir Conferência A4'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Date Navigator */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              max={todayIso}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-slate-900"
            />
            {selectedDate !== todayIso && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(todayIso)}>
                {locale === 'en' ? 'Today' : 'Hoje'}
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedDate >= todayIso}
            onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {closingQuery.isLoading ? (
          <Spinner />
        ) : !data ? null : (
          <>
            {/* Cash Drawer Highlight */}
            <div className="flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-300">
                    {locale === 'en'
                      ? 'Expected Cash Drawer (Cash In - Cash Out)'
                      : 'Saldo Esperado na Gaveta (Dinheiro)'}
                  </p>
                  <p className="font-mono text-2xl font-bold tabular-nums">
                    {formatBRL(cashDrawerNet, locale)}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="text-slate-300">{locale === 'en' ? 'Day Net Flow' : 'Saldo Líquido do Dia'}</p>
                <p className="font-mono text-base font-bold text-emerald-300 tabular-nums">
                  {formatBRL(data.netCashFlow, locale)}
                </p>
              </div>
            </div>

            {/* Matrix by Payment Method */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                  <tr>
                    <th className="px-3.5 py-2.5">{locale === 'en' ? 'Method' : 'Forma'}</th>
                    <th className="px-3.5 py-2.5 text-right">{locale === 'en' ? 'Income' : 'Entradas'}</th>
                    <th className="px-3.5 py-2.5 text-right">{locale === 'en' ? 'Expenses' : 'Saídas'}</th>
                    <th className="px-3.5 py-2.5 text-right">{locale === 'en' ? 'Balance' : 'Saldo'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {METHODS.map((method) => {
                    const inc = data.incomeByPaymentMethod?.[method] ?? 0;
                    const exp = data.expenseByPaymentMethod?.[method] ?? 0;
                    return (
                      <tr key={method}>
                        <td className="px-3.5 py-2 font-sans font-semibold text-slate-800">
                          {t.paymentMethod[method]}
                        </td>
                        <td className="px-3.5 py-2 text-right text-emerald-700">
                          {formatBRL(inc, locale)}
                        </td>
                        <td className="px-3.5 py-2 text-right text-red-700">
                          {formatBRL(exp, locale)}
                        </td>
                        <td className="px-3.5 py-2 text-right font-bold text-slate-900">
                          {formatBRL(inc - exp, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Settled Transactions */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {locale === 'en' ? 'Settled movements' : 'Movimentações liquidadas'} ({data.transactions.length})
              </p>
              {data.transactions.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {locale === 'en'
                    ? 'No settled transactions on this date.'
                    : `Nenhuma movimentação paga em ${formatDate(selectedDate, locale)}.`}
                </p>
              ) : (
                <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                  {data.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-3.5 py-2 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-semibold text-slate-900">
                          {formatTransactionDescription(tx.description, locale)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {t.paymentMethod[tx.paymentMethod]}
                          {tx.supplierName ? ` · ${tx.supplierName}` : ''}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-mono font-bold ${
                          tx.type === 'INCOME' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'} {formatBRL(tx.amount, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
