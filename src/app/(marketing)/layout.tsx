import type { Metadata } from 'next';
import React from 'react';
import { MarketingFooter, MarketingNavbar } from '@/components/marketing/MarketingChrome';
import { getMarketingHomePath } from '@/lib/server/marketingHost';
import { getSiteUrl } from '@/lib/siteConfig';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BenchOS · Sistema de Gestão para Assistência Técnica de Bancada',
    template: '%s · BenchOS',
  },
  description:
    'Controle ordens de serviço, fila de bancada, orçamentos com aprovação no WhatsApp, pedidos de peças, Pix sem taxa e caixa real — no Web e no App Android.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'BenchOS',
    title: 'BenchOS · Sistema de Gestão para Assistência Técnica de Bancada',
    description:
      'Acabe com as notinhas de papel e o "já ficou pronto?" no WhatsApp. Web + App Android + link /track para o cliente.',
  },
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const homePath = await getMarketingHomePath();

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900">
      <MarketingNavbar homePath={homePath} />
      <main className="flex-1">{children}</main>
      <MarketingFooter homePath={homePath} />
    </div>
  );
}
