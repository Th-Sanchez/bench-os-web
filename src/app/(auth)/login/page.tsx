'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button, Card, Field, Spinner, inputClassName } from '@/components/ui/Primitives';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email: email.trim().toLowerCase(), password });
      const next = searchParams.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/workbench';
      router.replace(safeNext);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          const secs = err.retryAfterSeconds;
          setError(secs ? `${t.auth.rateLimited} (${secs}s)` : t.auth.rateLimited);
        } else {
          setError(err.message);
        }
      } else {
        setError(t.common.errorGeneric);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-7 shadow-sm">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.auth.loginSubtitle}</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t.auth.emailLabel} required>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="oficina@exemplo.com.br"
            className={inputClassName}
          />
        </Field>

        <Field label={t.auth.passwordLabel} required>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClassName}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            {t.auth.forgotPasswordLink}
          </Link>
        </div>

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {t.auth.signInCta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-5 text-center text-xs text-slate-600">
        {t.auth.noAccount}{' '}
        <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
          {t.auth.createShopLink}
        </Link>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}
