const DEFAULT_SITE_URL = 'https://benchos.app.br';
const DEFAULT_APP_URL = 'https://app.benchos.app.br';
const DEFAULT_SUPPORT_EMAIL = 'contato@benchos.app.br';
const DEFAULT_MARKETING_HOSTS = ['benchos.app.br', 'www.benchos.app.br'];

export const PUBLIC_MARKETING_PATHS = ['/site', '/como-usar', '/privacidade', '/termos'] as const;

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '');
}

export function getSupportEmail(): string {
  return (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL).trim();
}

export function getSupportWhatsappDigits(): string {
  return (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '').replace(/\D/g, '');
}

export function buildSupportWhatsappUrl(message?: string): string | null {
  const digits = getSupportWhatsappDigits();
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function getMarketingHosts(): string[] {
  const configured = (process.env.NEXT_PUBLIC_MARKETING_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_MARKETING_HOSTS;
}

export function normalizeHostname(hostHeader: string | null | undefined): string {
  if (!hostHeader) return '';
  return hostHeader.split(',')[0].trim().split(':')[0].toLowerCase();
}

export function isMarketingHost(hostHeader: string | null | undefined): boolean {
  const hostname = normalizeHostname(hostHeader);
  if (!hostname) return false;
  return getMarketingHosts().includes(hostname);
}

export function isPublicMarketingPath(pathname: string): boolean {
  return PUBLIC_MARKETING_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function buildAppAuthHref(path: '/login' | '/register'): string {
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_APP_URL) {
    return path;
  }
  return `${getAppUrl()}${path}`;
}
