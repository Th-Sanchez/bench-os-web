import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail, MessageCircle } from 'lucide-react';
import { HowToUseGuide } from '@/components/marketing/HowToUseGuide';
import { getMarketingHomePath } from '@/lib/server/marketingHost';
import {
  buildAppAuthHref,
  buildSupportWhatsappUrl,
  getSiteUrl,
  getSupportEmail,
} from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Central Como Usar · Guias Rápidos do BenchOS',
  description:
    'Guias visuais e diretos para configurar sua oficina, abrir OS, enviar orçamentos no /track, controlar peças, Pix e comissões.',
  alternates: {
    canonical: `${getSiteUrl()}/como-usar`,
  },
};

export default async function ComoUsarPage() {
  const homePath = await getMarketingHomePath();
  const registerHref = buildAppAuthHref('/register');
  const loginHref = buildAppAuthHref('/login');
  const supportEmail = getSupportEmail();
  const whatsappUrl = buildSupportWhatsappUrl(
    'Olá! Estou na Central Como Usar do BenchOS e preciso de uma ajuda.'
  );

  return (
    <div className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
        {/* Clean compact header */}
        <div className="animate-fade-up flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link
              href={homePath}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              ← Voltar para o início
            </Link>
            <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Central Como Usar
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Escolha um fluxo abaixo para ver o passo a passo visual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={loginHref}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
            >
              Abrir meu painel
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={registerHref}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Criar conta grátis
            </a>
          </div>
        </div>

        {/* Interactive Visual Guide Explorer */}
        <div className="animate-fade-up" style={{ animationDelay: '90ms' }}>
          <HowToUseGuide />
        </div>

        {/* Compact support strip */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-6 py-5 text-white sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-base font-bold">Precisa de ajuda na configuração?</p>
            <p className="text-xs text-slate-300">
              Nosso time responde dúvidas sobre fluxo, Pix e migração da sua oficina.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            )}
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              <Mail className="h-3.5 w-3.5 text-blue-400" />
              {supportEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
