const MAX_CURRENCY_DIGITS = 11;

export function unmaskDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskInteger(value: string, maxLength = 4): string {
  return unmaskDigits(value).slice(0, maxLength);
}

export function maskCurrencyBRL(raw: string): string {
  const digits = unmaskDigits(raw).slice(0, MAX_CURRENCY_DIGITS);
  if (!digits) return '';
  const cents = Number.parseInt(digits, 10);
  if (!Number.isFinite(cents) || cents <= 0) return '';
  const padded = String(cents).padStart(3, '0');
  const integerPart = padded.slice(0, -2);
  const decimalPart = padded.slice(-2);
  const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInt},${decimalPart}`;
}

export function formatCurrencyInput(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '';
  }
  return maskCurrencyBRL(String(Math.round(value * 100)));
}

export function parseCurrencyBRL(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  if (trimmed.includes(',')) {
    const normalized = trimmed.replace(/[^\d,]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
  }

  const cleaned = trimmed.replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
}

export function maskPhoneBR(raw: string): string {
  const digits = unmaskDigits(raw).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, '($1) $2');
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

export function maskCpfCnpj(raw: string): string {
  const digits = unmaskDigits(raw).slice(0, 14);
  if (!digits) return '';

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

export function formatBRL(value: number | null | undefined, locale: 'pt-BR' | 'en' = 'pt-BR'): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function formatDate(iso: string | null | undefined, locale: 'pt-BR' | 'en' = 'pt-BR'): string {
  if (!iso) return '—';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string | null | undefined, locale: 'pt-BR' | 'en' = 'pt-BR'): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthRange(year: number, monthZeroIndexed: number): { from: string; to: string } {
  const first = new Date(year, monthZeroIndexed, 1);
  const last = new Date(year, monthZeroIndexed + 1, 0);
  return { from: toIsoDate(first), to: toIsoDate(last) };
}

export function buildWhatsappDirectUrl(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const digits = unmaskDigits(phone);
  if (!digits) return null;
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${withCountry}${query}`;
}
