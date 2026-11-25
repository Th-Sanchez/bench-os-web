'use client';

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

export type LabelPrintFormat = 'DISABLED' | 'A4' | 'THERMAL_58MM';

const STORAGE_KEY = 'benchos_web_print_format';
const CHANGE_EVENT = 'benchos-print-format-change';

function subscribeFormat(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getClientFormat(): LabelPrintFormat {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'DISABLED' || saved === 'A4' || saved === 'THERMAL_58MM') {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'A4';
}

function getServerFormat(): LabelPrintFormat {
  return 'A4';
}

interface PrintPreferencesContextValue {
  labelFormat: LabelPrintFormat;
  setLabelFormat: (format: LabelPrintFormat) => void;
}

const PrintPreferencesContext = createContext<PrintPreferencesContextValue | null>(null);

export function PrintPreferencesProvider({ children }: { children: React.ReactNode }) {
  const labelFormat = useSyncExternalStore(subscribeFormat, getClientFormat, getServerFormat);

  const setLabelFormat = useCallback((format: LabelPrintFormat) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, format);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const value = useMemo(
    () => ({ labelFormat, setLabelFormat }),
    [labelFormat, setLabelFormat]
  );

  return (
    <PrintPreferencesContext.Provider value={value}>
      {children}
    </PrintPreferencesContext.Provider>
  );
}

export function usePrintPreferences(): PrintPreferencesContextValue {
  const ctx = useContext(PrintPreferencesContext);
  if (!ctx) {
    throw new Error('usePrintPreferences must be used within PrintPreferencesProvider');
  }
  return ctx;
}
