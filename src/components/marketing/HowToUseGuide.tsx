'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Lightbulb,
  MapPin,
  Search,
} from 'lucide-react';
import { GuideVisualPreview } from '@/components/marketing/GuideVisualPreview';
import { HOW_TO_GUIDES, type HowToGuide } from '@/lib/marketingData';

export function HowToUseGuide() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(HOW_TO_GUIDES[0].id);

  const filteredGuides = useMemo<HowToGuide[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HOW_TO_GUIDES;
    return HOW_TO_GUIDES.filter(
      (guide) =>
        guide.title.toLowerCase().includes(q) ||
        guide.summary.toLowerCase().includes(q) ||
        guide.categoryLabel.toLowerCase().includes(q) ||
        guide.proTip.toLowerCase().includes(q) ||
        guide.steps.some(
          (s) => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q)
        )
    );
  }, [query]);

  const activeGuide =
    filteredGuides.find((g) => g.id === selectedId) ?? filteredGuides[0] ?? null;

  const activeIndex = activeGuide
    ? filteredGuides.findIndex((g) => g.id === activeGuide.id)
    : -1;
  const prevGuide = activeIndex > 0 ? filteredGuides[activeIndex - 1] : null;
  const nextGuide =
    activeIndex >= 0 && activeIndex < filteredGuides.length - 1
      ? filteredGuides[activeIndex + 1]
      : null;

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar guia... (ex.: Pix, peça, orçamento, comissão, garantia, offline)"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {filteredGuides.length === 0 || !activeGuide ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="font-display text-base font-bold text-slate-900">
            Nada encontrado para &ldquo;{query}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver todos os guias
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Mobile horizontal tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {filteredGuides.map((guide, idx) => {
              const active = guide.id === activeGuide.id;
              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setSelectedId(guide.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {idx + 1}. {guide.categoryLabel}
                </button>
              );
            })}
          </div>

          {/* Desktop left index */}
          <aside className="hidden space-y-1.5 lg:col-span-4 lg:block">
            {filteredGuides.map((guide, idx) => {
              const active = guide.id === activeGuide.id;
              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setSelectedId(guide.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    active
                      ? 'border-blue-600 bg-white shadow-sm ring-1 ring-blue-600/20'
                      : 'border-slate-200/80 bg-white/60 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                      active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold leading-snug ${
                        active ? 'text-blue-700' : 'text-slate-900'
                      }`}
                    >
                      {guide.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {guide.categoryLabel} · {guide.duration}
                    </p>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Active visual guide card */}
          <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-7 lg:col-span-8">
            <div key={activeGuide.id} className="animate-panel-in space-y-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                    {activeGuide.categoryLabel}
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {activeGuide.duration}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {activeGuide.where}
                    </span>
                  </div>
                </div>

                <h2 className="mt-3 font-display text-xl font-bold text-slate-900 sm:text-2xl">
                  {activeGuide.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600">{activeGuide.summary}</p>
              </div>

              {/* Real mini-UI preview */}
              <GuideVisualPreview guideId={activeGuide.id} />

              {/* Crisp 4 steps */}
              <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeGuide.steps.map((step, idx) => (
                  <li
                    key={step.title}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-900 font-mono text-[11px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-bold text-slate-900">{step.title}</h3>
                        <p className="text-xs leading-relaxed text-slate-600">{step.detail}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Compact tip */}
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-950">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>
                  <strong>Dica:</strong> {activeGuide.proTip}
                </p>
              </div>
            </div>

            {/* Previous / Next guide navigation */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              {prevGuide ? (
                <button
                  type="button"
                  onClick={() => setSelectedId(prevGuide.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {prevGuide.categoryLabel}
                </button>
              ) : (
                <span />
              )}

              {nextGuide ? (
                <button
                  type="button"
                  onClick={() => setSelectedId(nextGuide.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Próximo: {nextGuide.categoryLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="font-mono text-[11px] font-semibold text-emerald-700">
                  Fim do tour ✓
                </span>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
