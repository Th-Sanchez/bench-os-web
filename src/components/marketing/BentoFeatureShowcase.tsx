import React from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  QrCode,
  ShoppingCart,
  Star,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { Reveal } from '@/components/marketing/MotionPrimitives';

export function BentoFeatureShowcase() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* 1. Multi-aparelhos + Checklist de entrada (col-span-7) */}
      <Reveal className="lg:col-span-7" delayMs={0}>
      <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">
            Vários aparelhos na mesma OS + checklist rápido
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Cada item ganha etiqueta própria e status independente.
          </p>
        </div>

        <div className="mt-5 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                #1042-1
              </span>
              <span className="truncate text-xs font-bold text-slate-900">
                Micro-ondas Electrolux MEF41
              </span>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              PRONTO · R$ 220
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                #1042-2
              </span>
              <span className="truncate text-xs font-bold text-slate-900">
                Air Fryer Mondial AF-30
              </span>
            </div>
            <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              2 OPÇÕES ENVIADAS
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1">
              <ClipboardCheck className="h-3.5 w-3.5 text-blue-600" />
              Recebimento:
            </span>
            {['Prato devolvido', 'Aro retirado', 'Sem amassados'].map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
              >
                <Check className="h-3 w-3" />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
      </Reveal>

      {/* 2. Fila de Compras de Peças (col-span-5) */}
      <Reveal className="lg:col-span-5" delayMs={80}>
      <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">
            Fila de compras vinculada à OS
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Baixa em 1 clique soma o custo real e libera o reparo.
          </p>
        </div>

        <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900">Magnetron 2M219J</p>
              <p className="font-mono text-[10px] text-slate-500">#1045-1 · R$ 78,00</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
              <ShoppingCart className="h-3 w-3" />A pedir
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900">Bomba Ulka 110V</p>
              <p className="font-mono text-[10px] text-slate-500">#1043-1 · R$ 64,00</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">
              <PackageCheck className="h-3 w-3" />
              Chegou
            </span>
          </div>
        </div>
      </div>
      </Reveal>

      {/* 3. Pix sem taxa + Split na entrega (col-span-5) */}
      <Reveal className="lg:col-span-5" delayMs={60}>
      <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">
            Pix na hora e pagamento dividido
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            QR Code padrão Banco Central, direto na sua conta.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-2xs">
            <QrCode className="h-12 w-12 text-slate-900" strokeWidth={1.6} />
            <span className="font-mono text-[9px] font-bold text-emerald-700">0% TAXA</span>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 text-xs">
              <span className="font-semibold text-emerald-900">Pix</span>
              <span className="font-mono font-bold text-emerald-900">R$ 120,00</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
              <span className="font-semibold text-slate-700">Cartão</span>
              <span className="font-mono font-bold text-slate-900">R$ 100,00</span>
            </div>
          </div>
        </div>
      </div>
      </Reveal>

      {/* 4. Caixa real, Indicadores & Comissões (col-span-7) */}
      <Reveal className="lg:col-span-7" delayMs={120}>
      <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">
            Lucro real, indicadores e comissões da equipe
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Aprovação, prazo médio, custo de peças e comissão em um só lugar.
          </p>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Aprovação</p>
              <p className="mt-0.5 font-mono text-base font-bold text-blue-600">84%</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Margem real</p>
              <p className="mt-0.5 font-mono text-base font-bold text-emerald-600">68%</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Prazo médio</p>
              <p className="mt-0.5 font-mono text-base font-bold text-slate-900">1,4d</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-blue-600" />
              Técnico João · 15% sobre mão de obra
            </span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              R$ 480,00 no mês
            </span>
          </div>
        </div>
      </div>
      </Reveal>

      {/* 5. Pós-entrega: Avaliação Google + Dicas de conservação (col-span-12) */}
      <Reveal className="lg:col-span-12" delayMs={80}>
      <div className="grid grid-cols-1 items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md md:grid-cols-12">
        <div className="md:col-span-5">
          <h3 className="font-display text-lg font-bold text-slate-900">
            Pós-entrega automático no /track
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Entregou? O cliente recebe dicas de cuidado e um atalho 5★ para avaliar sua oficina no
            Google.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-7">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
            <div className="flex items-center gap-0.5 text-amber-500">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-slate-900">Obrigado pela avaliação 5★!</p>
            <span className="mt-2 inline-flex items-center rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
              Avaliar no Google →
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Dicas · Micro-ondas
            </p>
            <p className="flex items-start gap-1.5 text-xs text-slate-700">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Não ligue o aparelho vazio para proteger o magnetron.
            </p>
            <p className="flex items-start gap-1.5 text-xs text-slate-700">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Mantenha a mica interna limpa e sem gordura.
            </p>
          </div>
        </div>
      </div>
      </Reveal>
    </div>
  );
}
