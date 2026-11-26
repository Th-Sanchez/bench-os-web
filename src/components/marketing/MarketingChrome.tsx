'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Mail, Menu, MessageCircle, Wrench, X } from 'lucide-react';
import {
  buildAppAuthHref,
  buildSupportWhatsappUrl,
  getSupportEmail,
} from '@/lib/siteConfig';

function sectionHref(homePath: '/' | '/site', hash: string): string {
  return homePath === '/' ? `/#${hash}` : `/site#${hash}`;
}

export function MarketingNavbar({ homePath = '/' }: { homePath?: '/' | '/site' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const loginHref = buildAppAuthHref('/login');
  const registerHref = buildAppAuthHref('/register');

  const navLinks = [
    { href: sectionHref(homePath, 'recursos'), label: 'Recursos' },
    { href: sectionHref(homePath, 'fluxo'), label: 'Como funciona' },
    { href: sectionHref(homePath, 'planos'), label: 'Planos' },
    { href: '/como-usar', label: 'Como usar' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={homePath} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <span className="block font-display text-base font-bold leading-none text-slate-900">
              BenchOS
            </span>
            <span className="mt-0.5 block font-mono text-[10px] font-semibold tracking-wider text-slate-500">
              GESTÃO DE BANCADA
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <a
            href={loginHref}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Entrar
          </a>
          <a
            href={registerHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            Testar grátis
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden"
          aria-label="Abrir navegação"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <a
                href={loginHref}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                Entrar
              </a>
              <a
                href={registerHref}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white"
              >
                Testar grátis
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter({ homePath = '/' }: { homePath?: '/' | '/site' }) {
  const loginHref = buildAppAuthHref('/login');
  const registerHref = buildAppAuthHref('/register');
  const supportEmail = getSupportEmail();
  const whatsappUrl = buildSupportWhatsappUrl(
    'Olá! Quero saber mais sobre o BenchOS para minha assistência técnica.'
  );

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-5 space-y-3">
            <Link href={homePath} className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-bold leading-none text-white">BenchOS</p>
                <p className="mt-0.5 font-mono text-[10px] font-semibold tracking-wider text-slate-400">
                  WEB + ANDROID + /TRACK
                </p>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              Sistema de gestão para assistências técnicas de bancada — do balcão ao caixa real.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                <Mail className="h-3.5 w-3.5 text-blue-400" />
                {supportEmail}
              </a>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp comercial
                </a>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Produto</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href={sectionHref(homePath, 'recursos')} className="hover:text-white">
                  Recursos
                </Link>
              </li>
              <li>
                <Link href={sectionHref(homePath, 'fluxo')} className="hover:text-white">
                  Como funciona
                </Link>
              </li>
              <li>
                <Link href={sectionHref(homePath, 'planos')} className="hover:text-white">
                  Planos
                </Link>
              </li>
              <li>
                <Link href="/como-usar" className="inline-flex items-center gap-1 hover:text-white">
                  <BookOpen className="h-3.5 w-3.5" />
                  Central Como Usar
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Acesso</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href={loginHref} className="hover:text-white">
                  Entrar no painel
                </a>
              </li>
              <li>
                <a href={registerHref} className="hover:text-white">
                  Criar conta grátis
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Legal & LGPD</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/privacidade" className="hover:text-white">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos" className="hover:text-white">
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} BenchOS. Todos os direitos reservados.</p>
          <p className="font-mono text-[11px]">benchos.app.br · app.benchos.app.br</p>
        </div>
      </div>
    </footer>
  );
}
