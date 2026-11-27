import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, ShieldCheck, Smartphone } from 'lucide-react';
import { BentoFeatureShowcase } from '@/components/marketing/BentoFeatureShowcase';
import { Reveal } from '@/components/marketing/MotionPrimitives';
import { FaqAccordion, ProductShowcase } from '@/components/marketing/ProductShowcase';
import { LANDING_FAQ, PRICING_PLANS } from '@/lib/marketingData';
import {
  buildAppAuthHref,
  buildSupportWhatsappUrl,
  getSiteUrl,
  getSupportEmail,
} from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'BenchOS · Gestão Completa para Assistência Técnica de Bancada',
  description:
    'Ordens de serviço multi-aparelhos, link /track com aprovação de orçamento, fila de peças, Pix nativo sem taxa e financeiro real.',
  alternates: {
    canonical: getSiteUrl(),
  },
};

const FLOW_STAGES = [
  {
    badge: 'RECEBIDO',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-800',
    title: 'Entrada no balcão',
    caption: 'Abre a OS e envia o link /track no WhatsApp.',
  },
  {
    badge: 'ORÇADO',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-800',
    title: 'Aprovação em 1 toque',
    caption: 'Cliente escolhe a opção e aprova pelo celular.',
  },
  {
    badge: 'EM REPARO',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-800',
    title: 'Bancada + peças',
    caption: 'Peças na fila de compras e status ao vivo.',
  },
  {
    badge: 'ENTREGUE',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    title: 'Pix, recibo e caixa',
    caption: 'Fecha pagamento, garantia e lucro líquido.',
  },
];

export default function CommercialLandingPage() {
  const registerHref = buildAppAuthHref('/register');
  const loginHref = buildAppAuthHref('/login');
  const supportEmail = getSupportEmail();
  const whatsappUrl = buildSupportWhatsappUrl(
    'Olá! Quero saber mais sobre o BenchOS e módulos personalizados para minha oficina.'
  );

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-white via-slate-50/50 to-[#F8FAFC] pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span
              className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-700"
              style={{ animationDelay: '0ms' }}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Painel Web + App Android + Link /track
            </span>

            <h1
              className="animate-fade-up mt-5 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.12]"
              style={{ animationDelay: '70ms' }}
            >
              Acabe com as notinhas de papel e o{' '}
              <span className="text-blue-600">&ldquo;já ficou pronto?&rdquo;</span> no WhatsApp.
            </h1>

            <p
              className="animate-fade-up mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg"
              style={{ animationDelay: '130ms' }}
            >
              Da entrada na bancada ao caixa real — tudo sincronizado entre o computador do balcão
              e o celular do técnico.
            </p>

            <div
              className="animate-fade-up mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: '190ms' }}
            >
              <a
                href={registerHref}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md sm:w-auto"
              >
                Testar grátis por 14 dias
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/como-usar"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 sm:w-auto"
              >
                <BookOpen className="h-4 w-4 text-blue-600" />
                Ver como usar
              </Link>
            </div>

            <div
              className="animate-fade-up mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500"
              style={{ animationDelay: '240ms' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Sem cartão de crédito
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Configure em 5 minutos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Zero taxa no Pix
              </span>
            </div>
          </div>

          <div className="animate-fade-up mt-12" style={{ animationDelay: '280ms' }}>
            <ProductShowcase />
          </div>
        </div>
      </section>

      {/* Visual Bento Showcase */}
      <section id="recursos" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-blue-600">
              NA PRÁTICA
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              O que a sua oficina usa todo dia, sem tela sobrando
            </h2>
          </div>

          <div className="mt-8">
            <BentoFeatureShowcase />
          </div>
        </div>
      </section>

      {/* Visual Status Flow */}
      <section id="fluxo" className="scroll-mt-20 border-y border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-blue-600">
                CICLO DA OS
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-slate-900">
                4 etapas claras do balcão à retirada
              </h2>
            </div>
            <Link
              href="/como-usar"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Guias passo a passo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW_STAGES.map((stage, idx) => (
              <Reveal key={stage.badge} delayMs={idx * 70}>
                <div className="relative flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${stage.badgeClass}`}
                    >
                      {stage.badge}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">0{idx + 1}</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-display text-base font-bold text-slate-900">{stage.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{stage.caption}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-blue-600">
              PLANOS
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              14 dias grátis. Sem fidelidade.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {PRICING_PLANS.map((plan, idx) => (
              <Reveal key={plan.id} delayMs={idx * 90}>
                <div
                  className={`flex h-full flex-col justify-between rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-0.5 ${
                    plan.highlighted
                      ? 'border-blue-600 bg-white shadow-xl shadow-blue-600/10 ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white shadow-2xs hover:shadow-md'
                  }`}
                >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-bold text-slate-900">{plan.name}</h3>
                    {plan.badge && (
                      <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{plan.tagline}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold tracking-tight text-slate-900">
                      {plan.priceMonthly}
                    </span>
                    <span className="text-sm font-medium text-slate-500">{plan.periodLabel}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs font-semibold text-emerald-700">
                    {plan.trialNote}
                  </p>

                  <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7">
                  <a
                    href={registerHref}
                    className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {plan.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm text-slate-700">
                <strong>Precisa de mais usuários ou módulos sob medida?</strong>
              </p>
            </div>
            <a
              href={whatsappUrl ?? `mailto:${supportEmail}`}
              target={whatsappUrl ? '_blank' : undefined}
              rel={whatsappUrl ? 'noreferrer' : undefined}
              className="shrink-0 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              Falar com a equipe →
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-slate-900">
            Dúvidas rápidas
          </h2>

          <Reveal>
            <div className="mt-7">
              <FaqAccordion items={LANDING_FAQ} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-14 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Teste na sua bancada ainda hoje.
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-sm text-slate-300">
            Crie sua conta em minutos e mande o primeiro link /track no seu WhatsApp.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={registerHref}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-500 sm:w-auto"
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={loginHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-6 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
            >
              Entrar no painel
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
