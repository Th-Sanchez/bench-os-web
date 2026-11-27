import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/como-usar', '/privacidade', '/termos', '/excluir-conta'],
        disallow: [
          '/api/',
          '/login',
          '/register',
          '/forgot-password',
          '/workbench',
          '/orders',
          '/customers',
          '/finance',
          '/parts',
          '/settings',
          '/site',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
