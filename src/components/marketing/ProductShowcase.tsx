'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  QrCode,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Wrench,
} from 'lucide-react';
import type { FaqItem } from '@/lib/marketingData';

type ShowcaseTab = 'web' | 'mobile' | 'track';

export function ProductShowcase() {
  const [tab, setTab] = useState<ShowcaseTab>('web');
  const [selectedQuoteOption, setSelectedQuoteOption] = useState<'opt1' | 'opt2'>('opt2');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {(
          [
            { id: 'web', label: 'Painel Web (Bancada)', icon: LayoutGrid },
            { id: 'mobile', label: 'App Android (Oficina)', icon: Smartphone },
            { id: 'track', label: 'Link do Cliente (/track)', icon: Sparkles },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all sm:text-sm ${
                active
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        {/* Browser / App Window Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-0.5 font-mono text-[11px] text-slate-500">
            {tab === 'web'
              ? 'app.benchos.app.br/workbench'
              : tab === 'mobile'
                ? 'BenchOS Android · Bancada + Leitor QR'
                : 'api.benchos.app.br/track/os-1042'}
          </div>
          <span className="hidden items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-700 sm:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Tempo real
          </span>
        </div>

        <div key={tab} className="animate-panel-in">
        {tab === 'web' && (
          <div className="grid grid-cols-1 bg-[#F8FAFC] lg:grid-cols-12">
            <div className="hidden border-r border-slate-200 bg-white p-4 lg:col-span-3 lg:block">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-display text-xs font-bold text-slate-900">Eletro Bancada</p>
                  <p className="text-[10px] text-slate-500">Oficina ativa</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <div className="rounded-lg bg-blue-50 px-2.5 py-2 font-semibold text-blue-700">
                  Bancada (12)
                </div>
                <div className="px-2.5 py-1.5 text-slate-500">Ordens de Serviço</div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-slate-500">
                  <span>Fila de Compras</span>
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                    3
                  </span>
                </div>
                <div className="px-2.5 py-1.5 text-slate-500">Financeiro & Indicadores</div>
                <div className="px-2.5 py-1.5 text-slate-500">Ajustes da Oficina</div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-6 lg:col-span-9">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Na bancada</p>
                  <p className="mt-1 font-mono text-xl font-bold text-slate-900">12</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase text-amber-800">
                    Aguardando peça
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-amber-900">3</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase text-emerald-800">
                    Prontos p/ retirar
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-emerald-900">4</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                  <p className="text-[10px] font-semibold uppercase text-blue-800">
                    Aprovação mês
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-blue-900">84%</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    tag: '#1042-1',
                    appliance: 'Micro-ondas Electrolux MEF41',
                    customer: 'Maria Clara · (11) 98812-3401',
                    status: 'PRONTO',
                    statusClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
                    price: 'R$ 220,00',
                    note: 'Magnetron trocado · Pix liberado no /track',
                  },
                  {
                    tag: '#1042-2',
                    appliance: 'Air Fryer Mondial AF-30',
                    customer: 'Maria Clara · mesma OS',
                    status: 'AGUARDANDO APROVAÇÃO',
                    statusClass: 'border-violet-200 bg-violet-50 text-violet-800',
                    price: '2 opções enviadas',
                    note: 'R$ 95 (paralelo) ou R$ 145 (original)',
                  },
                  {
                    tag: '#1043-1',
                    appliance: 'Cafeteira Nespresso Essenza',
                    customer: 'Carlos Eduardo',
                    status: 'AGUARDANDO PEÇA',
                    statusClass: 'border-amber-200 bg-amber-50 text-amber-800',
                    price: 'Bomba Ulka 110V',
                    note: 'Pedido feito · na Fila de Compras',
                  },
                ].map((row) => (
                  <div
                    key={row.tag}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                          {row.tag}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{row.appliance}</span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${row.statusClass}`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {row.customer} · <span className="text-slate-700">{row.note}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-mono text-sm font-bold text-slate-900">{row.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'mobile' && (
          <div className="flex flex-col items-center justify-center gap-6 bg-slate-50 p-6 sm:flex-row sm:p-8">
            <div className="w-full max-w-[300px] rounded-[28px] border-4 border-slate-900 bg-white p-4 shadow-lg">
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <p className="font-mono text-[10px] font-bold text-blue-600">ELETRO BANCADA</p>
                  <p className="font-display text-base font-bold text-slate-900">Bancada</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-[11px] font-bold text-amber-800">
                    <ShoppingCart className="h-3.5 w-3.5" />3
                  </span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <QrCode className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                      #1042-1
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      EM REPARO
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">Micro-ondas Electrolux</p>
                  <p className="text-[11px] text-slate-500">
                    Diagnóstico: Magnetron em curto · 2 fotos anexadas
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-xs font-bold text-emerald-700">R$ 220,00</span>
                    <span className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">
                      Marcar Pronto
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-amber-900">#1043-1</span>
                    <span className="text-[10px] font-bold text-amber-800">PEÇA CHEGOU?</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900">Bomba Ulka 110V</p>
                  <p className="text-[11px] text-slate-600">
                    Baixe em 1 toque e some no custo real da OS.
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-sm space-y-3 text-left">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <Smartphone className="h-3.5 w-3.5" />
                Android direto na bancada
              </p>
              <h3 className="font-display text-xl font-bold text-slate-900">
                Tire fotos, leia a etiqueta QR e atualize o reparo sem sair da bancada.
              </h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Leitor de QR Code nativo para abrir a OS pela etiqueta colada.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Notificações push na hora em que o cliente aprova o orçamento.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Cache offline automático para consultar OS mesmo sem Wi-Fi.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {tab === 'track' && (
          <div className="grid grid-cols-1 items-center gap-6 bg-slate-50 p-6 lg:grid-cols-12 sm:p-8">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-md lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="font-display text-sm font-bold text-slate-900">
                    Eletro Bancada Assistência
                  </p>
                  <p className="text-[11px] text-slate-500">OS #1042 · Air Fryer Mondial AF-30</p>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-800">
                  ORÇAMENTO PRONTO
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Escolha a opção de reparo (clique para testar):
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedQuoteOption('opt1')}
                  className={`flex w-full items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                    selectedQuoteOption === 'opt1'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">Opção 1 · Reparo Econômico</p>
                    <p className="text-[11px] text-slate-500">
                      Troca do termostato paralelo (garantia 90 dias)
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900">R$ 95,00</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQuoteOption('opt2')}
                  className={`flex w-full items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                    selectedQuoteOption === 'opt2'
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Opção 2 · Peça Original + Limpeza
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Termostato original + revisão do cabo e higienização
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-blue-700">R$ 145,00</span>
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-2.5 text-white">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  Aprovar {selectedQuoteOption === 'opt1' ? 'R$ 95,00' : 'R$ 145,00'} agora
                </span>
                <span className="font-mono text-[10px] opacity-90">1 toque</span>
              </div>
            </div>

            <div className="space-y-3 lg:col-span-5">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <Star className="h-3.5 w-3.5" />
                Experiência profissional para o cliente
              </p>
              <h3 className="font-display text-xl font-bold text-slate-900">
                Seu cliente acompanha tudo sem precisar mandar &ldquo;já ficou pronto?&rdquo;
              </h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Sua logo, endereço, horário e termo de garantia no topo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Aprovação de orçamento único ou com múltiplas opções direto no link.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    QR Code Pix quando fica pronto, dicas de conservação e atalho 5★ para o Google
                    após a entrega.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70"
            >
              <span className="font-display text-sm font-bold text-slate-900 sm:text-base">
                {item.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="animate-panel-in px-5 pb-4 text-sm leading-relaxed text-slate-600">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
