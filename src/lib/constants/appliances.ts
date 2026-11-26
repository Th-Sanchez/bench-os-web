export const DEFAULT_APPLIANCE_TYPES = [
  'Micro-ondas',
  'Air Fryer',
  'Liquidificador',
  'Ventilador',
  'Aspirador',
  'Batedeira',
  'Cafeteira',
  'Ferro de Passar',
  'Forno Elétrico',
  'Panela Elétrica',
  'Sanduicheira / Grill',
  'Processador',
  'Secador de Cabelo',
  'Chapinha',
  'Torradeira',
  'Chaleira Elétrica',
  'Bebedouro',
  'Umidificador',
] as const;

export function mergeApplianceTypes(customTypes?: string[] | null): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of [...DEFAULT_APPLIANCE_TYPES, ...(customTypes ?? [])]) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

export function resolveChecklistForCategory(
  templates: Record<string, string[]> | undefined | null,
  applianceType: string
): string[] {
  if (!templates) return [];
  const normalized = applianceType.trim().toLowerCase();
  if (!normalized) return [];
  for (const [key, items] of Object.entries(templates)) {
    if (key.trim().toLowerCase() === normalized) {
      return items ?? [];
    }
  }
  return [];
}
