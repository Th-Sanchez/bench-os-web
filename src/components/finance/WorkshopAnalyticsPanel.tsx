'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Receipt,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Card, Spinner } from '@/components/ui/Primitives';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { WorkshopAnalyticsResponse } from '@/lib/types/api';
import { formatBRL } from '@/lib/utils/masks';

function formatSlaHours(hours: number | null | undefined, locale: string): string {
  if (hours == null || Number.isNaN(hours)) return '—';
  if (hours < 24) {
    return `${hours.toFixed(1).replace('.', locale === 'en' ? '.' : ',')} h`;
  }
  const days = hours / 24;
  return `${days.toFixed(1).replace('.', locale === 'en' ? '.' : ',')} ${locale === 'en' ? 'd' : 'dias'}`;
}

export function WorkshopAnalyticsPanel({
  analytics,
  loading,
}: {
  analytics: WorkshopAnalyticsResponse | undefined;
  loading: boolean;
}) {
  const { locale, t } = useI18n();

  if (loading && !analytics) {
    return <Spinner label={t.common.loading} />;
  }

  if (!analytics) {
    return null;
  }

  const approvalRate = analytics.quoteApprovalRatePercent;
  const approvalTone =
    approvalRate == null
      ? 'text-slate-400'
      : approvalRate >= 70
        ? 'text-emerald-700'
        : approvalRate >= 45
          ? 'text-amber-700'
          : 'text-red-700';

  const warrantyTone =
    analytics.warrantyReturnsCount === 0
      ? 'text-emerald-700'
      : analytics.warrantyReturnRatePercent <= 5
        ? 'text-emerald-700'
        : analytics.warrantyReturnRatePercent <= 12
          ? 'text-amber-700'
          : 'text-red-700';

  const totalFunnel =
    analytics.quotesApprovedCount +
    analytics.quotesRejectedCount +
    analytics.quotesPendingCount;
  const approvedPct = totalFunnel > 0 ? (analytics.quotesApprovedCount / totalFunnel) * 100 : 0;
  const pendingPct = totalFunnel > 0 ? (analytics.quotesPendingCount / totalFunnel) * 100 : 0;
  const rejectedPct = totalFunnel > 0 ? (analytics.quotesRejectedCount / totalFunnel) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Row 1: 5 Actionable Operational & Financial KPIs */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'Quote Approval' : 'Taxa de Aprovação'}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${approvalTone}`}>
            {approvalRate != null ? `${approvalRate.toFixed(1)}%` : '—'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {analytics.quotesApprovedCount} {locale === 'en' ? 'appr.' : 'aprov.'} ·{' '}
            {analytics.quotesRejectedCount} {locale === 'en' ? 'rej.' : 'rec.'} ·{' '}
            {analytics.quotesPendingCount} {locale === 'en' ? 'pend.' : 'pend.'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'SLA Intake → Quote' : 'SLA Entrada → Orç.'}</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatSlaHours(analytics.avgIntakeToQuoteHours, locale)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {analytics.intakeToQuoteSampleSize}{' '}
            {locale === 'en' ? 'quotes measured' : 'orçamentos medidos'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'SLA Approval → Ready' : 'SLA Aprov. → Pronto'}</span>
            <Wrench className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatSlaHours(analytics.avgApprovalToReadyHours, locale)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {locale === 'en' ? 'Total cycle:' : 'Ciclo total:'}{' '}
            <strong className="font-mono text-slate-700">
              {formatSlaHours(analytics.avgTotalTurnaroundHours, locale)}
            </strong>
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'Average Ticket' : 'Ticket Médio'}</span>
            <Receipt className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatBRL(analytics.averageTicket, locale)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {analytics.paidRepairsCount}{' '}
            {locale === 'en' ? 'paid repairs delivered' : 'reparos pagos entregues'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{locale === 'en' ? 'Warranty Return Rate' : 'Retorno em Garantia'}</span>
            <ShieldAlert className="h-4 w-4 text-violet-600" />
          </div>
          <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${warrantyTone}`}>
            {analytics.warrantyReturnRatePercent.toFixed(1)}%
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {analytics.warrantyReturnsCount}{' '}
            {locale === 'en' ? 'returns of' : 'retornos em'} {analytics.itemsReceivedCount}{' '}
            {locale === 'en' ? 'received' : 'entradas'}
          </p>
        </Card>
      </div>

      {/* Row 2: Quote Conversion + Real Margin & Live Bottlenecks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="p-5 space-y-5 lg:col-span-7">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {locale === 'en' ? 'Quote Decision Funnel' : 'Funil de Decisão de Orçamentos'}
                </h3>
                <p className="text-xs text-slate-500">
                  {locale === 'en'
                    ? `${analytics.quotesSentCount} quote(s) sent in this period`
                    : `${analytics.quotesSentCount} orçamento(s) enviado(s) neste período`}
                </p>
              </div>
              {approvalRate != null && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800">
                  {approvalRate.toFixed(1)}% {locale === 'en' ? 'conversion' : 'conversão'}
                </span>
              )}
            </div>

            {totalFunnel === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
                {locale === 'en'
                  ? 'No quotes decided in this period yet.'
                  : 'Nenhum orçamento decidido neste período ainda.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100">
                  {approvedPct > 0 && (
                    <div
                      style={{ width: `${approvedPct}%` }}
                      className="bg-emerald-500 transition-all"
                      title={`Aprovados: ${analytics.quotesApprovedCount}`}
                    />
                  )}
                  {pendingPct > 0 && (
                    <div
                      style={{ width: `${pendingPct}%` }}
                      className="bg-amber-400 transition-all"
                      title={`Pendentes: ${analytics.quotesPendingCount}`}
                    />
                  )}
                  {rejectedPct > 0 && (
                    <div
                      style={{ width: `${rejectedPct}%` }}
                      className="bg-red-400 transition-all"
                      title={`Recusados: ${analytics.quotesRejectedCount}`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                    <span className="text-emerald-800 font-medium">
                      {locale === 'en' ? 'Approved' : 'Aprovados'}
                    </span>
                    <p className="font-mono text-base font-bold text-emerald-900">
                      {analytics.quotesApprovedCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                    <span className="text-amber-800 font-medium">
                      {locale === 'en' ? 'Awaiting' : 'Aguardando'}
                    </span>
                    <p className="font-mono text-base font-bold text-amber-900">
                      {analytics.quotesPendingCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
                    <span className="text-red-800 font-medium">
                      {locale === 'en' ? 'Rejected' : 'Recusados'}
                    </span>
                    <p className="font-mono text-base font-bold text-red-900">
                      {analytics.quotesRejectedCount}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                {locale === 'en' ? 'Net Repair Margin' : 'Margem Líquida dos Reparos'}
              </span>
              <span className="font-mono text-sm font-bold text-emerald-700">
                {analytics.netProfitMarginPercent.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-slate-500">{locale === 'en' ? 'Revenue' : 'Faturado'}</p>
                <p className="mt-0.5 font-mono font-bold text-slate-900">
                  {formatBRL(analytics.totalRevenue, locale)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-slate-500">{locale === 'en' ? 'Parts cost' : 'Custo peças'}</p>
                <p className="mt-0.5 font-mono font-bold text-slate-700">
                  {formatBRL(analytics.totalPartsCostActual, locale)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <p className="text-emerald-700">{locale === 'en' ? 'Net profit' : 'Lucro líquido'}</p>
                <p className="mt-0.5 font-mono font-bold text-emerald-900">
                  {formatBRL(analytics.netRepairProfit, locale)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Live Actionable Bottlenecks */}
        <Card className="p-5 flex flex-col justify-between gap-4 lg:col-span-5">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">
              {locale === 'en' ? 'Current Workshop Bottlenecks' : 'Gargalos Atuais na Oficina'}
            </h3>
            <p className="text-xs text-slate-500">
              {locale === 'en'
                ? 'Live snapshot of items needing attention right now'
                : 'Retrato ao vivo do que pede ação agora na operação'}
            </p>

            <div className="mt-4 space-y-2">
              <Link
                href="/workbench"
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs transition-colors ${
                  analytics.overdueActiveCount > 0
                    ? 'border-red-200 bg-red-50/70 text-red-900 hover:bg-red-50'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      analytics.overdueActiveCount > 0 ? 'text-red-600' : 'text-slate-400'
                    }`}
                  />
                  {locale === 'en' ? 'Past estimated deadline' : 'Com prazo vencido'}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-sm font-bold">
                  {analytics.overdueActiveCount}
                  <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                </span>
              </Link>

              <Link
                href="/workbench"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <span className="font-medium">
                  {locale === 'en' ? 'Awaiting diagnosis / quote' : 'Aguardando diagnóstico / orçamento'}
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {analytics.awaitingQuoteCount}
                </span>
              </Link>

              <Link
                href="/workbench"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <span className="font-medium">
                  {locale === 'en' ? 'Awaiting customer approval' : 'Aguardando aprovação do cliente'}
                </span>
                <span className="font-mono text-sm font-bold text-amber-700">
                  {analytics.awaitingApprovalCount}
                </span>
              </Link>

              <Link
                href="/parts"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <span className="font-medium">
                  {locale === 'en' ? 'Waiting for parts' : 'Aguardando peças'}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-blue-700">
                  {analytics.waitingPartsCount}
                  <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                </span>
              </Link>

              <Link
                href="/workbench"
                className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 py-2.5 text-xs text-emerald-900 hover:bg-emerald-50"
              >
                <span className="font-medium">
                  {locale === 'en' ? 'Ready for pickup' : 'Prontos aguardando retirada'}
                </span>
                <span className="font-mono text-sm font-bold text-emerald-800">
                  {analytics.readyForPickupCount}
                </span>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
