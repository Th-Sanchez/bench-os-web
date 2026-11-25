'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/endpoints';
import { setUnauthorizedHandler } from '@/lib/api/http';
import type { ClientSession, LoginRequest, RegisterTenantRequest } from '@/lib/types/api';

interface AuthContextValue {
  session: ClientSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  signIn: (payload: LoginRequest) => Promise<ClientSession>;
  registerShop: (payload: RegisterTenantRequest) => Promise<ClientSession>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialSession = null,
  children,
}: {
  initialSession?: ClientSession | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ClientSession | null>(initialSession);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authApi.session();
      setSession(res.authenticated ? res.session : null);
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Proceed even if network call fails
    }
    queryClient.clear();
    setSession(null);
    router.replace('/login');
  }, [queryClient, router]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.clear();
      setSession(null);
      router.replace('/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient, router]);

  const signIn = useCallback(
    async (payload: LoginRequest) => {
      const nextSession = await authApi.login(payload);
      queryClient.clear();
      setSession(nextSession);
      return nextSession;
    },
    [queryClient]
  );

  const registerShop = useCallback(
    async (payload: RegisterTenantRequest) => {
      const nextSession = await authApi.register(payload);
      queryClient.clear();
      setSession(nextSession);
      return nextSession;
    },
    [queryClient]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: session !== null,
      isOwner: session?.user.role === 'OWNER',
      signIn,
      registerShop,
      signOut,
      refreshSession,
    }),
    [session, isLoading, signIn, registerShop, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
