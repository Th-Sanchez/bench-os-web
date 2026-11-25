'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button, Card, Field, inputClassName } from '@/components/ui/Primitives';
import { authApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/http';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setInfo(t.auth.codeSent);
      setStep('reset');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      setInfo(t.auth.passwordResetOk);
      window.setTimeout(() => router.replace('/login'), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-7 shadow-sm">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">{t.auth.forgotTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {step === 'request' ? t.auth.forgotSubtitle : t.auth.resetSubtitle}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {info && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{info}</span>
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <Field label={t.auth.emailLabel} required>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="oficina@exemplo.com.br"
              className={inputClassName}
            />
          </Field>
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {t.auth.sendCodeCta}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <Field label={t.auth.emailLabel} required>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label={t.auth.codeLabel} required>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`${inputClassName} font-mono text-center text-lg tracking-[0.4em]`}
            />
          </Field>
          <Field label={t.auth.newPasswordLabel} required>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClassName}
            />
          </Field>
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {t.auth.resetPasswordCta}
          </Button>
        </form>
      )}

      <div className="mt-6 border-t border-slate-200 pt-5 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.auth.backToLogin}
        </Link>
      </div>
    </Card>
  );
}
