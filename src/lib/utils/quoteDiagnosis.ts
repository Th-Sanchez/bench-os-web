import type { PartCatalogResponse } from '@/lib/types/api';

function normalizeCategoryToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const UNIVERSAL_TOKENS = new Set(['geral', 'universal', 'todos', 'all']);

export function classifyPartForAppliance(
  part: Pick<PartCatalogResponse, 'applianceCategory'>,
  applianceType: string
): 'exact' | 'universal' | 'other' {
  const raw = (part.applianceCategory ?? '').trim();
  if (!raw) return 'universal';

  const target = normalizeCategoryToken(applianceType);
  const tokens = raw
    .split(/[,;]/)
    .map(normalizeCategoryToken)
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return 'universal';
  if (target && tokens.includes(target)) return 'exact';
  if (tokens.some((token) => UNIVERSAL_TOKENS.has(token))) return 'universal';
  return 'other';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function appendPartToDiagnosis(
  currentText: string,
  partName: string,
  prefix: string
): string {
  const trimmed = currentText.trim();
  const cleanPart = partName.trim();
  if (!cleanPart) return currentText;

  if (trimmed.toLowerCase().includes(cleanPart.toLowerCase())) {
    return currentText;
  }

  return trimmed ? `${trimmed} + ${cleanPart}` : `${prefix} ${cleanPart}`;
}

export function removePartFromDiagnosis(
  currentText: string,
  partName: string,
  prefix: string
): string {
  const trimmed = currentText.trim();
  if (!trimmed) return '';

  const escapedName = escapeRegExp(partName.trim());
  const escapedPrefix = escapeRegExp(prefix);

  // Exact "<Prefix> <Part>"
  if (new RegExp(`^${escapedPrefix}\\s+${escapedName}$`, 'i').test(trimmed)) {
    return '';
  }

  // Starts with "<Prefix> <Part> + <Rest>" -> "<Prefix> <Rest>"
  const leadingWithPrefix = new RegExp(`^${escapedPrefix}\\s+${escapedName}\\s*\\+\\s*`, 'i');
  if (leadingWithPrefix.test(trimmed)) {
    return trimmed.replace(leadingWithPrefix, `${prefix} `).trim();
  }

  // Appended "... + <Part>" (middle or end)
  const appended = new RegExp(`\\s*\\+\\s*${escapedName}(?=\\s*\\+|$)`, 'i');
  if (appended.test(trimmed)) {
    return trimmed.replace(appended, '').trim();
  }

  // Starts with "<Part> + <Rest>"
  const leadingPlain = new RegExp(`^${escapedName}\\s*\\+\\s*`, 'i');
  if (leadingPlain.test(trimmed)) {
    return trimmed.replace(leadingPlain, '').trim();
  }

  // Exact "<Part>"
  if (new RegExp(`^${escapedName}$`, 'i').test(trimmed)) {
    return '';
  }

  return currentText;
}
