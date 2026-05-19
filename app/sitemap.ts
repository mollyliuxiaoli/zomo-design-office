import { MetadataRoute } from 'next';

const domain = process.env.NEXT_PUBLIC_BRAND_DOMAIN || 'distill.style';

const SEO_STYLES = [
  'linear-app',
  'stripe',
  'apple',
  'vercel',
  'notion',
  'tailwind-css',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = `https://${domain}`;

  const stylePages = SEO_STYLES.map((slug) => ({
    url: `${baseUrl}/styles/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/analyze`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/showcase`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...stylePages,
  ];
}
