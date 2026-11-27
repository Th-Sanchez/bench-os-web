'use client';

import React, { useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  ClipboardCheck,
  MessageCircle,
  PackageCheck,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  Star,
  UserCheck,
  WifiOff,
  Wrench,
} from 'lucide-react';

export function GuideVisualPreview({ guideId }: { guideId: string }) {
  const [quoteMode, setQuoteMode] = useState<'single' | 'multi'>('multi');

  if (guideId === 'configurar-oficina') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Wrench className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Ajustes da Oficina</p>
              <p className="text-[10px] text-slate-500">Sua marca no /track e nos recibos</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            Pronto em 5 min
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Chave Pix</p>
            <p className="mt-0.5 truncate font-mono text-xs font-bold text-slate-900">
              12.345.678/0001-90
            </p>
            <span className="text-[10px] font-semibold text-emerald-700">0% taxa</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Google 5★</p>
            <p className="mt-0.5 truncate font-mono text-xs font-bold text-slate-900">
              g.page/r/oficina
            </p>
            <span className="text-[10px] font-semibold text-amber-600">Ativo pós-entrega</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Recursos opcionais</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                Assinatura: OFF
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                Equipe: OFF
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (guideId === 'abrir-nova-os') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
              OS #1042
            </span>
            <span className="text-xs font-bold text-slate-900">Maria Clara · (11) 98812-3401</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
            <MessageCircle className="h-3 w-3" />
            Enviar /track
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-blue-700">#1042-1</span>
              <span className="text-[10px] font-mono text-slate-500">110V</span>
            </div>
            <p className="text-xs font-bold text-slate-900">Micro-ondas Electrolux</p>
            <p className="text-[11px] text-slate-500">Liga mas não esquenta</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-blue-700">#1042-2</span>
              <span className="text-[10px] font-mono text-slate-500">110V</span>
            </div>
            <p className="text-xs font-bold text-slate-900">Air Fryer Mondial</p>
            <p className="text-[11px] text-slate-500">Desliga após 3 min</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5 text-blue-600" />
          {['Prato devolvido', 'Aro retirado', 'Sem amassados'].map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
            >
              <Check className="h-3 w-3" />
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (guideId === 'diagnostico-orcamento') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-900">
            Modo do orçamento (teste abaixo):
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setQuoteMode('single')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                quoteMode === 'single' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              Preço único
            </button>
            <button
              type="button"
              onClick={() => setQuoteMode('multi')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                quoteMode === 'multi' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              Múltiplas opções
            </button>
          </div>
        </div>

        <div key={quoteMode} className="animate-panel-in">
        {quoteMode === 'single' ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <p className="text-xs font-bold text-slate-900">Troca do Magnetron 2M219J</p>
              <p className="text-[11px] text-slate-500">Peça R$ 80 + Mão de obra R$ 140</p>
            </div>
            <span className="font-mono text-sm font-bold text-emerald-700">R$ 220,00</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Opção 1 · Econômica</span>
                <span className="font-mono text-xs font-bold text-slate-900">R$ 95</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Termostato paralelo</p>
            </div>
            <div className="rounded-lg border border-blue-500 bg-blue-50/70 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Opção 2 · Original ✓</span>
                <span className="font-mono text-xs font-bold text-blue-700">R$ 145</span>
              </div>
              <p className="mt-0.5 text-[11px] text-blue-800">Peça original + limpeza</p>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  if (guideId === 'fila-pecas') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Fila de Compras</span>
          <span className="font-mono text-[10px] font-semibold text-slate-500">
            A pedir → Pedido feito → Chegou
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-xs font-bold text-slate-900">Magnetron 2M219J</p>
              <p className="font-mono text-[10px] text-slate-500">#1045-1 · R$ 78,00</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <ShoppingCart className="h-3 w-3" />A pedir
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
            <div>
              <p className="text-xs font-bold text-slate-900">Bomba Ulka 110V</p>
              <p className="font-mono text-[10px] text-emerald-800">#1043-1 · Volta p/ Em Reparo</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">
              <PackageCheck className="h-3 w-3" />
              Chegou
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (guideId === 'entrega-pix-garantia') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
        <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:col-span-7">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <QrCode className="h-9 w-9 text-slate-900" strokeWidth={1.6} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-bold text-slate-900">Pagamento dividido</p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
                  Pix R$ 120
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                  Cartão R$ 100
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 sm:col-span-5 space-y-1">
            <div className="flex items-center gap-0.5 text-amber-500">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <p className="text-xs font-bold text-slate-900">Pós-entrega ativo</p>
            <p className="flex items-center gap-1 text-[11px] text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Garantia 90d + Google
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (guideId === 'financeiro-indicadores-comissoes') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Aprovação</p>
            <p className="font-mono text-base font-bold text-blue-600">84%</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Margem real</p>
            <p className="font-mono text-base font-bold text-emerald-600">68%</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400">SLA médio</p>
            <p className="font-mono text-base font-bold text-slate-900">1,4d</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <UserCheck className="h-3.5 w-3.5 text-blue-600" />
            João (Técnico) · 15% · <strong className="font-mono text-slate-900">R$ 480,00</strong>
          </span>
          <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white">
            Lançar no caixa
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
          <Camera className="h-4 w-4 text-blue-600" />
          <p className="text-xs font-bold text-slate-900">Fotos na bancada</p>
          <p className="text-[11px] text-slate-500">Anexe fotos direto na OS.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
          <Bell className="h-4 w-4 text-emerald-600" />
          <p className="text-xs font-bold text-slate-900">Push ao vivo</p>
          <p className="text-[11px] text-slate-500">Avisa quando aprovarem no /track.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <p className="text-xs font-bold text-slate-900">Cache offline</p>
          <p className="text-[11px] text-slate-500">Consulte OS sem Wi-Fi.</p>
        </div>
      </div>
    </div>
  );
}
