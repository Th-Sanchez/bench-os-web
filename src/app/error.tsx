'use client';

import React, { useEffect } from 'react';
import { captureWebException } from '@/lib/observability/sentryClient';

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureWebException(error, {
      'error.source': 'react_error_boundary',
      ...(error.digest ? { 'next.digest': error.digest } : {}),
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="font-display text-lg font-bold text-slate-900">
          Ocorreu um erro inesperado
        </h2>
        <p className="text-sm text-slate-600">
          Nossa equipe foi notificada automaticamente. Tente recarregar esta tela.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
