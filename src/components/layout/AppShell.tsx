'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  BookOpen,
  ClipboardList,
  Cog,
  Globe,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { ordersApi } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { canAccessFinance } from '@/lib/utils/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
  exact?: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { locale, toggleLocale, t } = useI18n();
  const toast = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickTag, setQuickTag] = useState('');
  const [searchingTag, setSearchingTag] = useState(false);

  const role = session?.user.role;

  const navItems: NavItem[] = [
    { href: '/workbench', label: t.nav.workbench, icon: LayoutGrid },
    { href: '/orders', label: t.nav.orders, icon: ClipboardList, exact: true },
    { href: '/orders/stale', label: t.nav.stale, icon: Archive },
    { href: '/customers', label: t.nav.customers, icon: Users },
    { href: '/finance', label: t.nav.finance, icon: Wallet, ownerOnly: true },
    { href: '/parts', label: t.nav.parts, icon: Package },
    { href: '/settings', label: t.nav.settings, icon: Cog },
  ];

  const visibleNav = navItems.filter((item) => !item.ownerOnly || canAccessFinance(role));

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    if (item.href === '/orders' && pathname.startsWith('/orders/stale')) return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  async function handleQuickTagSearch(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = quickTag.trim().replace(/^#/, '');
    if (!cleaned) return;

    setSearchingTag(true);
    try {
      const queue = await ordersApi.listBenchQueue({ tag: cleaned, size: 5 });
      if (queue.content.length > 0) {
        const hit = queue.content[0];
        setQuickTag('');
        router.push(`/orders/${hit.serviceOrderId}?item=${hit.id}`);
        return;
      }

      const numeric = Number.parseInt(cleaned.split('-')[0], 10);
      if (Number.isFinite(numeric)) {
        const orders = await ordersApi.list({ orderNumber: numeric, size: 1 });
        if (orders.content.length > 0) {
          setQuickTag('');
          router.push(`/orders/${orders.content[0].id}`);
          return;
        }
      }

      toast.warning(t.nav.quickSearchNotFound, `#${cleaned}`);
    } catch {
      toast.error(t.common.errorGeneric);
    } finally {
      setSearchingTag(false);
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <Link href="/workbench" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold leading-tight text-slate-900 truncate">
              BenchOS
            </p>
            <p className="text-[11px] font-medium text-slate-500 truncate">
              {session?.tenant.name ?? 'Oficina'}
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        <Link href="/orders/new" onClick={() => setMobileMenuOpen(false)}>
          <Button variant="primary" size="md" className="w-full justify-center">
            <Plus className="h-4 w-4" />
            {t.nav.newOrder}
          </Button>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 space-y-2">
        <Link
          href="/como-usar"
          target="_blank"
          rel="noreferrer"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <BookOpen className="h-3.5 w-3.5 text-blue-600" />
          <span>{locale === 'en' ? 'Help & How to use' : 'Central Como Usar'}</span>
        </Link>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {session?.user.name ?? 'Operador'}
            </p>
            {role && (
              <span className="shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                {t.role[role]}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 truncate">{session?.user.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t.common.logout}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:pl-64">
      {/* Desktop Sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[85vw]">{sidebarContent}</div>
        </div>
      )}

      {/* Topbar */}
      <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs lg:px-6">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <form onSubmit={handleQuickTagSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={quickTag}
              onChange={(e) => setQuickTag(e.target.value)}
              disabled={searchingTag}
              placeholder={t.nav.quickSearchPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Alternar idioma / Switch language"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            {locale === 'pt-BR' ? 'PT' : 'EN'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">{children}</main>
    </div>
  );
}
