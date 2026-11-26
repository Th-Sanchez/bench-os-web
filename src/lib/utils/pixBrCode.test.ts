import { describe, expect, it } from 'vitest';
import { buildPixBrCode, crc16CcittFalse } from './pixBrCode';

describe('pixBrCode', () => {
  it('computes standard CRC16-CCITT-FALSE check value', () => {
    expect(crc16CcittFalse('123456789')).toBe('29B1');
  });

  it('generates valid BCB EMV static Pix payload with valid CRC', () => {
    const payload = buildPixBrCode({
      pixKey: '12345678000199',
      merchantName: 'Oficina São José Eletrodomésticos Ltda',
      merchantCity: 'São Paulo',
      amount: 145.5,
      txid: 'OS1042',
    });

    expect(payload).not.toBeNull();
    expect(payload!).toContain('000201');
    expect(payload!).toContain('0014br.gov.bcb.pix011412345678000199');
    expect(payload!).toContain('5406145.50');
    expect(payload!).toContain('5925Oficina Sao Jose Eletrodo');
    expect(payload!).toContain('6009Sao Paulo');
    expect(payload!).toContain('62100506OS1042');

    const prefix = payload!.slice(0, -4);
    const crc = payload!.slice(-4);
    expect(crc).toBe(crc16CcittFalse(prefix));
  });

  it('returns null for keys with whitespace', () => {
    expect(buildPixBrCode({ pixKey: '11 99999-8888' })).toBeNull();
  });
});
