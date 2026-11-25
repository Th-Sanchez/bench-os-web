import { NextResponse } from 'next/server';
import { readServerSession, toClientSession } from '@/lib/server/sessionCookie';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await readServerSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false, session: null },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { authenticated: true, session: toClientSession(session) },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
