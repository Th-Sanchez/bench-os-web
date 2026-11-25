import React from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { readServerSession } from '@/lib/server/sessionCookie';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readServerSession();
  if (!session) {
    redirect('/login');
  }

  return <AppShell>{children}</AppShell>;
}
