'use client';

import React, { useEffect } from 'react';
import { captureWebException } from '@/lib/observability/sentryClient';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureWebException(error, {
      'error.source': 'react_global_error_boundary',
      ...(error.digest ? { 'next.digest': error.digest } : {}),
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
        <div className="max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs">
          <h2 className="text-lg font-bold">Ocorreu um erro inesperado</h2>
          <p className="text-sm text-slate-600">
            O problema foi registrado automaticamente. Clique abaixo para recarregar o painel.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Recarregar painel
          </button>
        </div>
      </body>
    </html>
  );
}
