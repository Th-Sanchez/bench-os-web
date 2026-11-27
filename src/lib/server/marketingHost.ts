import { headers } from 'next/headers';
import { isMarketingHost } from '@/lib/siteConfig';

export async function getMarketingHomePath(): Promise<'/' | '/site'> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host');
  return isMarketingHost(host) ? '/' : '/site';
}
