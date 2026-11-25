import { financeApi } from '@/lib/api/endpoints';
import type { Locale } from '@/lib/i18n/translations';
import type { FinancialTransactionResponse } from '@/lib/types/api';
import { formatDate } from './masks';
import { formatTransactionDescription } from './transactionDescription';

export async function fetchAllPeriodTransactions(
  from: string,
  to: string
): Promise<FinancialTransactionResponse[]> {
  const first = await financeApi.listTransactions({ from, to, page: 0, size: 100 });
  const all = [...first.content];
  for (let p = 1; p < Math.min(first.totalPages, 20); p += 1) {
    const next = await financeApi.listTransactions({ from, to, page: p, size: 100 });
    all.push(...next.content);
  }
  return all;
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export function buildMonthlyFinanceCsv(
  transactions: FinancialTransactionResponse[],
  locale: Locale = 'pt-BR'
): string {
  const headers = [
    'Data',
    'Tipo',
    'Categoria',
    'Descrição',
    'Fornecedor',
    'Forma Pagamento',
    'Status',
    'Vencimento',
    'Pago em',
    'Valor (R$)',
  ];

  const rows = transactions.map((tx) => {
    const signedAmount = tx.type === 'EXPENSE' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
    const amountBr = signedAmount.toFixed(2).replace('.', ',');
    return [
      formatDate(tx.createdAt, 'pt-BR'),
      tx.type === 'INCOME' ? 'Entrada' : 'Saída',
      tx.category,
      formatTransactionDescription(tx.description, locale),
      tx.supplierName ?? '',
      tx.paymentMethod,
      tx.status === 'PAID' ? 'Pago' : 'Pendente',
      tx.dueDate ? formatDate(tx.dueDate, 'pt-BR') : '',
      tx.paidAt ? formatDate(tx.paidAt, 'pt-BR') : '',
      amountBr,
    ]
      .map(escapeCsvCell)
      .join(';');
  });

  // UTF-8 BOM for clean Excel pt-BR opening
  return `\uFEFF${headers.map(escapeCsvCell).join(';')}\r\n${rows.join('\r\n')}`;
}

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
