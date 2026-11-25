import { redirect } from 'next/navigation';
import { readServerSession } from '@/lib/server/sessionCookie';

export default async function HomePage() {
  const session = await readServerSession();
  if (session) {
    redirect('/workbench');
  }
  redirect('/login');
}
