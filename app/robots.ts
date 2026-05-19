import { MetadataRoute } from 'next';

const domain = process.env.NEXT_PUBLIC_BRAND_DOMAIN || 'distill.style';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
