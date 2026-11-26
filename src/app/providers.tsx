'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import {
  initSentryClient,
  type WebSentryConfig,
} from '@/lib/observability/sentryClient';
import { PrintPreferencesProvider } from '@/lib/settings/PrintPreferencesContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import type { ClientSession } from '@/lib/types/api';

export function AppProviders({
  initialSession,
  sentryConfig,
  children,
}: {
  initialSession: ClientSession | null;
  sentryConfig?: WebSentryConfig;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (sentryConfig) {
      initSentryClient(sentryConfig);
    }
  }, [sentryConfig]);
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
