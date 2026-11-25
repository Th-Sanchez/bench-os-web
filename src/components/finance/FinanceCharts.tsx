'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/Primitives';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type {
  FinancialSummaryResponse,
  TransactionCategory,
  TransactionPaymentMethod,
} from '@/lib/types/api';
import { formatBRL } from '@/lib/utils/masks';

export interface MonthlyTrendPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

const PIE_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#6366F1', '#64748B'];

export function FinanceCharts({
  trend,
  summary,
}: {
  trend: MonthlyTrendPoint[];
  summary: FinancialSummaryResponse | undefined;
}) {
  const { locale, t } = useI18n();

  const paymentData = Object.entries(summary?.incomeByPaymentMethod ?? {})
    .filter(([, val]) => typeof val === 'number' && val > 0)
    .map(([key, val]) => ({
      name: t.paymentMethod[key as TransactionPaymentMethod] ?? key,
      value: val as number,
    }));

  const categoryData = Object.entries(summary?.expenseByCategory ?? {})
    .filter(([, val]) => typeof val === 'number' && val > 0)
    .map(([key, val]) => ({
      name: t.category[key as TransactionCategory] ?? key,
      value: val as number,
    }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* 6-Month Cashflow Trend */}
      <Card className="p-5 lg:col-span-7">
        <h3 className="font-display text-sm font-bold text-slate-900">
          {locale === 'en' ? '6-Month Cash Flow' : 'Fluxo de Caixa (Últimos 6 Meses)'}
        </h3>
        <p className="text-xs text-slate-500">
          {locale === 'en' ? 'Paid income vs. paid expenses' : 'Entradas pagas × Saídas pagas'}
        </p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} width={64} />
              <Tooltip
                formatter={(value) => formatBRL(Number(value ?? 0), locale)}
                contentStyle={{
                  borderRadius: '10px',
                  borderColor: '#E2E8F0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar
                dataKey="income"
                name={locale === 'en' ? 'Income' : 'Entradas'}
                fill="#10B981"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name={locale === 'en' ? 'Expenses' : 'Saídas'}
                fill="#EF4444"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Income by Payment Method + Expense Breakdown */}
      <Card className="p-5 lg:col-span-5 flex flex-col justify-between gap-4">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900">
            {locale === 'en' ? 'Income by Payment Method' : 'Entradas por Forma de Pagamento'}
          </h3>
          {paymentData.length === 0 ? (
            <p className="mt-6 text-center text-xs text-slate-400">{t.common.noResults}</p>
          ) : (
            <div className="mt-2 grid grid-cols-2 items-center gap-2">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={38}
                      outerRadius={66}
                      paddingAngle={3}
                    >
                      {paymentData.map((entry, idx) => (
                        <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatBRL(Number(val ?? 0), locale)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 text-xs">
                {paymentData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate text-slate-600">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      {entry.name}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatBRL(entry.value, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {locale === 'en' ? 'Expenses by Category' : 'Saídas por Categoria'}
          </h4>
          {categoryData.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">{t.common.noResults}</p>
          ) : (
            <div className="mt-2 space-y-1.5 text-xs">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <span className="text-slate-600">{cat.name}</span>
                  <span className="font-mono font-semibold text-red-700 tabular-nums">
                    {formatBRL(cat.value, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
