'use client';

import React from 'react';
import Link from 'next/link';
import { Wrench, Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale, toggleLocale, t } = useI18n();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-bold leading-none text-slate-900">BenchOS</p>
            <p className="mt-0.5 font-mono text-[10px] font-semibold tracking-wider text-slate-500">
              {t.auth.tagline}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Globe className="h-3.5 w-3.5 text-slate-500" />
          {locale === 'pt-BR' ? 'PT-BR' : 'EN'}
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-slate-500 space-y-1.5">
        <p>{t.auth.footerNote}</p>
        <div className="flex items-center justify-center gap-3 text-[11px]">
          <Link href="/como-usar" className="hover:text-slate-800 hover:underline">
            {locale === 'en' ? 'How to use' : 'Como usar'}
          </Link>
          <span>·</span>
          <Link href="/privacidade" className="hover:text-slate-800 hover:underline">
            {locale === 'en' ? 'Privacy' : 'Privacidade'}
          </Link>
          <span>·</span>
          <Link href="/termos" className="hover:text-slate-800 hover:underline">
            {locale === 'en' ? 'Terms' : 'Termos'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
