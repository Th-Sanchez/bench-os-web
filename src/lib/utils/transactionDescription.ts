import type { Locale } from '@/lib/i18n/translations';
import type { TransactionPaymentMethod } from '@/lib/types/api';

const REPAIR_PAYMENT_PATTERN =
  /^Repair payment\s*-\s*Order\s+#([\w-]+)(?:\s*\(([^)]+)\))?$/i;

const PAYMENT_METHOD_LABELS: Record<Locale, Record<TransactionPaymentMethod, string>> = {
  'pt-BR': {
    PIX: 'Pix',
    CREDIT_CARD: 'Crédito',
    DEBIT_CARD: 'Débito',
    CASH: 'Dinheiro',
    STORE_CREDIT: 'Fiado',
  },
  en: {
    PIX: 'Pix',
    CREDIT_CARD: 'Credit Card',
    DEBIT_CARD: 'Debit Card',
    CASH: 'Cash',
    STORE_CREDIT: 'Store Credit',
  },
};

/**
 * Localizes auto-generated backend repair payment descriptions
 * (e.g. "Repair payment - Order #1042-1 (CREDIT_CARD)") into the active UI locale,
 * leaving user-entered descriptions untouched.
 */
export function formatTransactionDescription(
  description: string | null | undefined,
  locale: Locale
): string {
  if (!description) return '';
  const trimmed = description.trim();
  const match = REPAIR_PAYMENT_PATTERN.exec(trimmed);
  if (!match) return description;

  const [, tag, rawMethod] = match;
  const normalizedMethod = rawMethod?.trim().toUpperCase() as TransactionPaymentMethod | undefined;
  const methodLabel =
    normalizedMethod && normalizedMethod in PAYMENT_METHOD_LABELS[locale]
      ? PAYMENT_METHOD_LABELS[locale][normalizedMethod]
      : rawMethod?.trim();

  const methodSuffix = methodLabel ? ` (${methodLabel})` : '';
  if (locale === 'pt-BR') {
    return `Pagamento de reparo - OS #${tag}${methodSuffix}`;
  }
  return `Repair payment - Order #${tag}${methodSuffix}`;
}
