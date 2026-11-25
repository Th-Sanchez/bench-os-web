'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button, Card, Field, inputClassName } from '@/components/ui/Primitives';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { maskCpfCnpj, maskPhoneBR, unmaskDigits } from '@/lib/utils/masks';

export default function RegisterPage() {
  const router = useRouter();
  const { registerShop } = useAuth();
  const { t } = useI18n();

  const [shopName, setShopName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerShop({
        shopName: shopName.trim(),
        document: unmaskDigits(document),
        phone: unmaskDigits(phone),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace('/workbench');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-7 shadow-sm">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">{t.auth.registerTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.auth.registerSubtitle}</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field label={t.auth.shopNameLabel} required>
          <input
            type="text"
            required
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Eletro Bancada Assistência"
            className={inputClassName}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label={t.auth.documentLabel} required>
            <input
              type="text"
              required
              value={document}
              onChange={(e) => setDocument(maskCpfCnpj(e.target.value))}
              placeholder="00.000.000/0001-00"
              className={`${inputClassName} font-mono`}
            />
          </Field>
          <Field label={t.auth.phoneLabel} required>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
              className={`${inputClassName} font-mono`}
            />
          </Field>
        </div>

        <Field label={t.auth.ownerNameLabel} required>
          <input
            type="text"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="João Silva"
            className={inputClassName}
          />
        </Field>

        <Field label={t.auth.emailLabel} required>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dono@oficina.com.br"
            className={inputClassName}
          />
        </Field>

        <Field label={t.auth.passwordLabel} required>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className={inputClassName}
          />
        </Field>

        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          {t.auth.registerCta}
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-5 text-center text-xs text-slate-600">
        {t.auth.hasAccount}{' '}
        <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
          {t.auth.signInLink}
        </Link>
      </div>
    </Card>
  );
}
