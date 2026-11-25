import { describe, expect, it } from 'vitest';
import { appendPartToDiagnosis, removePartFromDiagnosis } from './quoteDiagnosis';
import { formatTransactionDescription } from './transactionDescription';

describe('quoteDiagnosis helpers', () => {
  it('appends and cleanly removes a single part in pt-BR', () => {
    const added = appendPartToDiagnosis('', 'Magnetron 2M219J', 'Troca de');
    expect(added).toBe('Troca de Magnetron 2M219J');
    expect(removePartFromDiagnosis(added, 'Magnetron 2M219J', 'Troca de')).toBe('');
  });

  it('removes first, middle, and last parts without leaving orphan separators', () => {
    let diag = appendPartToDiagnosis('', 'Magnetron', 'Troca de');
    diag = appendPartToDiagnosis(diag, 'Fusível HV', 'Troca de');
    diag = appendPartToDiagnosis(diag, 'Capacitor', 'Troca de');
    expect(diag).toBe('Troca de Magnetron + Fusível HV + Capacitor');

    // Remove middle
    const noMiddle = removePartFromDiagnosis(diag, 'Fusível HV', 'Troca de');
    expect(noMiddle).toBe('Troca de Magnetron + Capacitor');

    // Remove first
    const noFirst = removePartFromDiagnosis(noMiddle, 'Magnetron', 'Troca de');
    expect(noFirst).toBe('Troca de Capacitor');

    // Remove last
    expect(removePartFromDiagnosis(noFirst, 'Capacitor', 'Troca de')).toBe('');
  });

  it('preserves manual diagnosis text when removing an appended part', () => {
    const diag = appendPartToDiagnosis('Curto na placa', 'Relé 12V', 'Troca de');
    expect(diag).toBe('Curto na placa + Relé 12V');
    expect(removePartFromDiagnosis(diag, 'Relé 12V', 'Troca de')).toBe('Curto na placa');
  });
});

describe('formatTransactionDescription', () => {
  it('translates backend auto-generated repair payment descriptions to pt-BR', () => {
    expect(
      formatTransactionDescription('Repair payment - Order #1042-1 (PIX)', 'pt-BR')
    ).toBe('Pagamento de reparo - OS #1042-1 (Pix)');

    expect(
      formatTransactionDescription('Repair payment - Order #1042-2 (CREDIT_CARD)', 'pt-BR')
    ).toBe('Pagamento de reparo - OS #1042-2 (Crédito)');

    expect(
      formatTransactionDescription('Repair payment - Order #1042-1', 'pt-BR')
    ).toBe('Pagamento de reparo - OS #1042-1');
  });

  it('formats payment methods cleanly in English and keeps manual descriptions untouched', () => {
    expect(
      formatTransactionDescription('Repair payment - Order #1042-1 (DEBIT_CARD)', 'en')
    ).toBe('Repair payment - Order #1042-1 (Debit Card)');

    expect(
      formatTransactionDescription('Compra de peças - Distribuidora', 'pt-BR')
    ).toBe('Compra de peças - Distribuidora');
  });
});
