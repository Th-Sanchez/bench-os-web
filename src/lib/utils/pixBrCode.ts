/**
 * Banco Central do Brasil compliant static Pix BR Code (EMV QRCPS-MPM) generator.
 * Works offline with zero payment gateway fees.
 */

const PIX_GUI = 'br.gov.bcb.pix';
const MAX_PIX_KEY_LENGTH = 77;
const MAX_MERCHANT_NAME_LENGTH = 25;
const MAX_MERCHANT_CITY_LENGTH = 15;
const MAX_TXID_LENGTH = 25;

export interface PixBrCodeParams {
  pixKey: string;
  merchantName?: string | null;
  merchantCity?: string | null;
  amount?: number | null;
  txid?: string | null;
}

function tlv(id: string, value: string): string {
  const byteLength = new TextEncoder().encode(value).length;
  const len = String(byteLength).padStart(2, '0');
  return `${id}${len}${value}`;
}

function sanitizeAscii(raw: string | null | undefined, maxLength: number, fallback: string): string {
  if (!raw || !raw.trim()) return fallback;
  const stripped = raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ./-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
  return stripped || fallback;
}

function sanitizeTxid(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return '***';
  const cleaned = raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, MAX_TXID_LENGTH);
  return cleaned || '***';
}

export function crc16CcittFalse(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i] << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixBrCode({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txid,
}: PixBrCodeParams): string | null {
  const trimmedKey = pixKey.trim();
  if (!trimmedKey || trimmedKey.length > MAX_PIX_KEY_LENGTH || /\s/.test(trimmedKey)) {
    return null;
  }

  const name = sanitizeAscii(merchantName, MAX_MERCHANT_NAME_LENGTH, 'OFICINA');
  const city = sanitizeAscii(merchantCity, MAX_MERCHANT_CITY_LENGTH, 'BRASIL');
  const reference = sanitizeTxid(txid);

  const merchantAccountInfo = tlv('00', PIX_GUI) + tlv('01', trimmedKey);
  const additionalData = tlv('05', reference);

  let payload = '';
  payload += tlv('00', '01');
  payload += tlv('26', merchantAccountInfo);
  payload += tlv('52', '0000');
  payload += tlv('53', '986');
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    payload += tlv('54', amount.toFixed(2));
  }
  payload += tlv('58', 'BR');
  payload += tlv('59', name);
  payload += tlv('60', city);
  payload += tlv('62', additionalData);
  payload += '6304';

  return payload + crc16CcittFalse(payload);
}
