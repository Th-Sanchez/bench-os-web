'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { PrintPreferencesProvider } from '@/lib/settings/PrintPreferencesContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import type { ClientSession } from '@/lib/types/api';

export function AppProviders({
  initialSession,
  children,
}: {
  initialSession: ClientSession | null;
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 1;
            },
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider initialSession={initialSession}>
            <PrintPreferencesProvider>{children}</PrintPreferencesProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
