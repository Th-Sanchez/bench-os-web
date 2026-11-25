'use client';

import React, { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Printer,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { DailyCashClosingModal } from '@/components/finance/DailyCashClosingModal';
import { FinanceCharts, type MonthlyTrendPoint } from '@/components/finance/FinanceCharts';
import {
  PayTransactionModal,
  SuppliersDrawer,
  TransactionFormModal,
} from '@/components/finance/FinanceModals';
import { Button, Card, EmptyState, Spinner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { financeApi, ordersApi } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type {
  DailyCashClosingResponse,
  FinancialTransactionResponse,
  TransactionStatus,
  TransactionType,
} from '@/lib/types/api';
import {
  buildMonthlyFinanceCsv,
  fetchAllPeriodTransactions,
  triggerCsvDownload,
} from '@/lib/utils/financeExport';
import { formatBRL, formatDate, getMonthRange, toIsoDate } from '@/lib/utils/masks';
import { canAccessFinance } from '@/lib/utils/permissions';
import { formatTransactionDescription } from '@/lib/utils/transactionDescription';

export default function FinancePage() {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const toast = useToast();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [txTypeFilter, setTxTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState<TransactionStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<FinancialTransactionResponse | null>(null);
  const [closingOpen, setClosingOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [printClosingData, setPrintClosingData] = useState<DailyCashClosingResponse | null>(null);

  const allowed = canAccessFinance(session?.user.role);
  const { from, to } = useMemo(() => getMonthRange(year, month), [year, month]);
  const todayIso = toIsoDate(new Date());

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month, 1));
  }, [year, month, locale]);

  // Last 6 months descriptors for Recharts trend
  const lastSixMonths = useMemo(() => {
    return Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(year, month - (5 - idx), 1);
      const range = getMonthRange(date.getFullYear(), date.getMonth());
      const label = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
        month: 'short',
      }).format(date);
      return { ...range, label };
    });
  }, [year, month, locale]);

  const summaryQuery = useQuery({
    queryKey: ['finance', 'summary', from, to],
    queryFn: () => financeApi.getSummary({ from, to }),
    enabled: allowed,
  });

  const todayClosingQuery = useQuery({
    queryKey: ['finance', 'daily-closing', todayIso],
    queryFn: () => financeApi.getDailyClosing({ date: todayIso, zone: 'America/Sao_Paulo' }),
    enabled: allowed,
  });

  const profitabilityQuery = useQuery({
    queryKey: ['finance', 'profitability', from, to],
    queryFn: () => ordersApi.getProfitability({ from, to, zone: 'America/Sao_Paulo' }),
    enabled: allowed,
  });

  const transactionsQuery = useQuery({
    queryKey: ['finance', 'transactions', from, to, txTypeFilter, txStatusFilter, page],
    queryFn: () =>
      financeApi.listTransactions({
        from,
        to,
        type: txTypeFilter === 'ALL' ? undefined : txTypeFilter,
        status: txStatusFilter === 'ALL' ? undefined : txStatusFilter,
        page,
        size: 20,
      }),
    enabled: allowed,
  });

  const trendQueries = useQueries({
    queries: lastSixMonths.map((m) => ({
      queryKey: ['finance', 'summary', m.from, m.to],
      queryFn: () => financeApi.getSummary({ from: m.from, to: m.to }),
      staleTime: 5 * 60_000,
      enabled: allowed,
    })),
  });

  const trendData: MonthlyTrendPoint[] = lastSixMonths.map((m, idx) => {
    const s = trendQueries[idx]?.data;
    return {
      label: m.label,
      income: s?.totalIncomePaid ?? 0,
      expense: s?.totalExpensePaid ?? 0,
      net: s?.netBalance ?? 0,
    };
  });

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setPage(0);
  }

  async function handleExportCsv() {
    setExportingCsv(true);
    try {
      const list = await fetchAllPeriodTransactions(from, to);
      const csv = buildMonthlyFinanceCsv(list, locale);
      triggerCsvDownload(`benchos-financeiro-${from.slice(0, 7)}.csv`, csv);
      toast.success(locale === 'en' ? 'CSV exported' : 'Planilha CSV exportada!');
    } catch {
      toast.error(t.common.errorGeneric);
    } finally {
      setExportingCsv(false);
    }
  }

  function handlePrintDailyClosing(closing: DailyCashClosingResponse) {
    setPrintClosingData(closing);
    window.setTimeout(() => window.print(), 150);
  }

  if (!allowed) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8 text-amber-500" />}
        title={locale === 'en' ? 'Owner access required' : 'Acesso restrito ao proprietário (DONO)'}
      />
    );
  }

  const summary = summaryQuery.data;
  const prof = profitabilityQuery.data;
  const todayClosing = todayClosingQuery.data;
  const txPage = transactionsQuery.data;

  return (
    <>
      <div className="no-print space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{t.nav.finance}</h1>
            <p className="text-sm text-slate-500 capitalize">{monthLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 font-mono text-xs font-semibold capitalize text-slate-800">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setSuppliersOpen(true)}>
              <Building2 className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Suppliers' : 'Fornecedores'}
            </Button>

            <Button variant="outline" size="sm" loading={exportingCsv} onClick={handleExportCsv}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPrintClosingData(null);
                window.setTimeout(() => window.print(), 100);
              }}
            >
              <Printer className="h-3.5 w-3.5" />
              {locale === 'en' ? 'Print A4' : 'Extrato A4'}
            </Button>

            <Button variant="primary" size="sm" onClick={() => setTxModalOpen(true)}>
              <Plus className="h-4 w-4" />
              {locale === 'en' ? 'New Entry' : 'Novo Lançamento'}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{locale === 'en' ? 'Paid Income' : 'Entradas (Pagas)'}</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
              {formatBRL(summary?.totalIncomePaid, locale)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{locale === 'en' ? 'Paid Expenses' : 'Saídas (Pagas)'}</span>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-1.5 font-mono text-2xl font-bold text-red-700 tabular-nums">
              {formatBRL(summary?.totalExpensePaid, locale)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{locale === 'en' ? 'Net Balance' : 'Saldo Líquido'}</span>
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <p
              className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
                (summary?.netBalance ?? 0) >= 0 ? 'text-slate-900' : 'text-red-700'
              }`}
            >
              {formatBRL(summary?.netBalance, locale)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{locale === 'en' ? 'Pending / Overdue' : 'Fiado Pendente / Vencido'}</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1.5 font-mono text-2xl font-bold text-amber-700 tabular-nums">
              {formatBRL(summary?.totalPendingPayables, locale)}
            </p>
            {(summary?.totalOverduePayables ?? 0) > 0 && (
              <p className="mt-0.5 text-xs font-semibold text-red-600">
                {locale === 'en' ? 'Overdue:' : 'Vencido:'}{' '}
                {formatBRL(summary?.totalOverduePayables, locale)}
              </p>
            )}
          </Card>
        </div>

        {/* Today's Cash Drawer + Repair Profitability Strip */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5 flex flex-wrap items-center justify-between gap-4 border-blue-200 bg-blue-50/35">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                <Banknote className="h-4 w-4" />
                {locale === 'en' ? "Today's Cash Box" : 'Caixa de Hoje'}
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {formatBRL(todayClosing?.netCashFlow, locale)}
              </p>
              <p className="text-xs text-slate-600">
                Pix: <strong className="font-mono">{formatBRL(todayClosing?.incomeByPaymentMethod?.PIX, locale)}</strong>
                {' · '}
                {locale === 'en' ? 'Cash' : 'Dinheiro'}:{' '}
                <strong className="font-mono">{formatBRL(todayClosing?.incomeByPaymentMethod?.CASH, locale)}</strong>
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setClosingOpen(true)}>
              {locale === 'en' ? 'Open Daily Closing' : 'Fechamento de Caixa'}
            </Button>
          </Card>

          <Card className="p-5 flex flex-wrap items-center justify-between gap-4 border-emerald-200 bg-emerald-50/35">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-4 w-4" />
                {locale === 'en' ? 'Real Repair Margin' : 'Margem Real dos Reparos'}
              </p>
              <p className="font-mono text-2xl font-bold text-emerald-800 tabular-nums">
                {formatBRL(prof?.estimatedNetProfit, locale)}{' '}
                <span className="text-sm font-semibold">
                  ({(prof?.profitMarginPercent ?? 0).toFixed(1)}%)
                </span>
              </p>
              <p className="text-xs text-slate-600">
                {prof?.deliveredItemsCount ?? 0} {locale === 'en' ? 'delivered' : 'entregues'} ·{' '}
                {locale === 'en' ? 'Parts cost' : 'Custo peças'}:{' '}
                <strong className="font-mono">{formatBRL(prof?.totalPartsCostActual, locale)}</strong>
              </p>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <FinanceCharts trend={trendData} summary={summary} />

        {/* Transactions Table */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              {locale === 'en' ? 'Transactions' : 'Extrato de Lançamentos'}
            </h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={txTypeFilter}
                onChange={(e) => {
                  setTxTypeFilter(e.target.value as TransactionType | 'ALL');
                  setPage(0);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">{locale === 'en' ? 'All types' : 'Todos os tipos'}</option>
                <option value="INCOME">{locale === 'en' ? 'Income' : 'Entradas'}</option>
                <option value="EXPENSE">{locale === 'en' ? 'Expenses' : 'Saídas'}</option>
              </select>

              <select
                value={txStatusFilter}
                onChange={(e) => {
                  setTxStatusFilter(e.target.value as TransactionStatus | 'ALL');
                  setPage(0);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">{locale === 'en' ? 'All statuses' : 'Todos os status'}</option>
                <option value="PAID">{locale === 'en' ? 'Paid' : 'Pago'}</option>
                <option value="PENDING">{locale === 'en' ? 'Pending (Credit)' : 'Pendente (Fiado)'}</option>
              </select>
            </div>
          </div>

          {transactionsQuery.isLoading ? (
            <Spinner />
          ) : !txPage || txPage.content.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">{t.common.noResults}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{locale === 'en' ? 'Date' : 'Data'}</th>
                    <th className="px-4 py-3">{locale === 'en' ? 'Description' : 'Descrição'}</th>
                    <th className="px-4 py-3">{locale === 'en' ? 'Method' : 'Forma'}</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">{locale === 'en' ? 'Amount' : 'Valor'}</th>
                    <th className="px-4 py-3 text-right">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {txPage.content.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-600">
                        {formatDate(tx.paidAt ?? tx.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {formatTransactionDescription(tx.description, locale)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.category[tx.category]}
                          {tx.supplierName ? ` · ${tx.supplierName}` : ''}
                          {tx.dueDate && tx.status === 'PENDING'
                            ? ` · Venc: ${formatDate(tx.dueDate, locale)}`
                            : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-700">
                        {t.paymentMethod[tx.paymentMethod]}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                            tx.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {tx.status === 'PAID'
                            ? locale === 'en'
                              ? 'Paid'
                              : 'Pago'
                            : locale === 'en'
                              ? 'Pending'
                              : 'Pendente'}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-right font-mono font-bold tabular-nums ${
                          tx.type === 'INCOME' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'} {formatBRL(tx.amount, locale)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {tx.status === 'PENDING' && (
                          <Button variant="success" size="sm" onClick={() => setPayTarget(tx)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {locale === 'en' ? 'Settle' : 'Quitar'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {txPage && txPage.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>
                {txPage.page + 1} / {txPage.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= txPage.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Printable A4 Financial Report / Daily Closing */}
      <div className="print-only text-black text-xs">
        {printClosingData ? (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2 flex justify-between">
              <div>
                <h1 className="text-lg font-bold uppercase">{session?.tenant.name ?? 'BenchOS'}</h1>
                <p>Fechamento de Caixa · {formatDate(printClosingData.date, 'pt-BR')}</p>
              </div>
              <div className="text-right font-mono font-bold text-base">
                Saldo: {formatBRL(printClosingData.netCashFlow, 'pt-BR')}
              </div>
            </div>
            <p>
              Entradas: <strong>{formatBRL(printClosingData.totalIncomePaid, 'pt-BR')}</strong> |
              Saídas: <strong>{formatBRL(printClosingData.totalExpensePaid, 'pt-BR')}</strong>
            </p>
            <table className="w-full border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 p-1.5 text-left">Descrição</th>
                  <th className="border border-slate-400 p-1.5 text-left">Forma</th>
                  <th className="border border-slate-400 p-1.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {printClosingData.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="border border-slate-400 p-1.5">
                      {formatTransactionDescription(tx.description, locale)}
                    </td>
                    <td className="border border-slate-400 p-1.5">{tx.paymentMethod}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono">
                      {tx.type === 'INCOME' ? '+' : '-'} {formatBRL(tx.amount, 'pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2 flex justify-between">
              <div>
                <h1 className="text-lg font-bold uppercase">{session?.tenant.name ?? 'BenchOS'}</h1>
                <p className="capitalize">Extrato Financeiro Mensal · {monthLabel}</p>
              </div>
              <div className="text-right font-mono font-bold text-base">
                Saldo: {formatBRL(summary?.netBalance, 'pt-BR')}
              </div>
            </div>
            <p>
              Entradas: <strong>{formatBRL(summary?.totalIncomePaid, 'pt-BR')}</strong> | Saídas:{' '}
              <strong>{formatBRL(summary?.totalExpensePaid, 'pt-BR')}</strong> | Fiado Pendente:{' '}
              <strong>{formatBRL(summary?.totalPendingPayables, 'pt-BR')}</strong>
            </p>
            <table className="w-full border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 p-1.5 text-left">Data</th>
                  <th className="border border-slate-400 p-1.5 text-left">Descrição</th>
                  <th className="border border-slate-400 p-1.5 text-left">Status</th>
                  <th className="border border-slate-400 p-1.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(txPage?.content ?? []).map((tx) => (
                  <tr key={tx.id}>
                    <td className="border border-slate-400 p-1.5 font-mono">
                      {formatDate(tx.paidAt ?? tx.createdAt, 'pt-BR')}
                    </td>
                    <td className="border border-slate-400 p-1.5">
                      {formatTransactionDescription(tx.description, locale)}
                    </td>
                    <td className="border border-slate-400 p-1.5">{tx.status}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono">
                      {tx.type === 'INCOME' ? '+' : '-'} {formatBRL(tx.amount, 'pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      <TransactionFormModal open={txModalOpen} onClose={() => setTxModalOpen(false)} />
      <PayTransactionModal transaction={payTarget} onClose={() => setPayTarget(null)} />
      <DailyCashClosingModal
        open={closingOpen}
        onClose={() => setClosingOpen(false)}
        onPrintClosing={handlePrintDailyClosing}
      />
      <SuppliersDrawer open={suppliersOpen} onClose={() => setSuppliersOpen(false)} />
    </>
  );
}
