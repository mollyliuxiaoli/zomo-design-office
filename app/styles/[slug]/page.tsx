import { Metadata } from 'next';
import StylePageClient from './StylePageClient';

type Props = { params: Promise<{ slug: string }> };

// Pre-built style pages for SEO
const STYLE_PAGES: Record<string, { title: string; description: string; keywords: string[]; colors: { primary: string[]; secondary: string[]; background: string[] }; font: string }> = {
  'linear-app': {
    title: 'Linear App Style Analysis',
    description: 'Complete visual style breakdown of Linear — the modern project management tool. Colors, typography, spacing, and component specifications.',
    keywords: ['linear', 'project-management', 'dark-mode', 'purple', 'modern', 'minimal'],
    colors: { primary: ['#5E6AD2', '#8B5CF6'], secondary: ['#1C1C28', '#2B2B3D'], background: ['#0A0A0F', '#12121A'] },
    font: 'Inter',
  },
  'stripe': {
    title: 'Stripe Website Style Analysis',
    description: 'Complete visual style breakdown of Stripe — the payment infrastructure platform. Colors, typography, gradients, and component specs.',
    keywords: ['stripe', 'fintech', 'gradients', 'purple', 'professional', 'premium'],
    colors: { primary: ['#635BFF', '#7C3AED'], secondary: ['#0A2540', '#425466'], background: ['#FFFFFF', '#F6F9FC'] },
    font: 'Inter',
  },
  'apple': {
    title: 'Apple.com Style Analysis',
    description: 'Complete visual style breakdown of Apple.com — clean minimalism at its finest. Typography, spacing, and design system specifications.',
    keywords: ['apple', 'minimal', 'clean', 'san-francisco', 'premium', 'photography'],
    colors: { primary: ['#0071E3', '#2997FF'], secondary: ['#1D1D1F', '#86868B'], background: ['#FFFFFF', '#F5F5F7'] },
    font: 'SF Pro',
  },
  'vercel': {
    title: 'Vercel Website Style Analysis',
    description: 'Complete visual style breakdown of Vercel — the frontend cloud platform. Dark theme, monospace accents, and clean design.',
    keywords: ['vercel', 'dark-theme', 'developer', 'monospace', 'clean', 'nextjs'],
    colors: { primary: ['#FFFFFF', '#0070F3'], secondary: ['#888888', '#666666'], background: ['#000000', '#111111'] },
    font: 'Inter',
  },
  'notion': {
    title: 'Notion App Style Analysis',
    description: 'Complete visual style breakdown of Notion — the all-in-one workspace. Clean typography, warm colors, and functional design.',
    keywords: ['notion', 'productivity', 'warm', 'clean', 'functional', 'typography'],
    colors: { primary: ['#000000', '#2EAADC'], secondary: ['#9B9A97', '#DFDED8'], background: ['#FFFFFF', '#FBFBFA'] },
    font: 'Inter',
  },
  'tailwind-css': {
    title: 'Tailwind CSS Website Style Analysis',
    description: 'Complete visual style breakdown of the Tailwind CSS website. Vibrant gradients, dark theme, and developer-focused design.',
    keywords: ['tailwind', 'css', 'developer', 'gradient', 'dark', 'vibrant'],
    colors: { primary: ['#38BDF8', '#818CF8'], secondary: ['#94A3B8', '#64748B'], background: ['#0F172A', '#1E293B'] },
    font: 'Inter',
  },
};

export async function generateStaticParams() {
  return Object.keys(STYLE_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = STYLE_PAGES[slug];
  if (!page) return { title: 'Style Not Found' };

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    openGraph: {
      title: page.title,
      description: page.description,
      images: [`/api/og?title=${encodeURIComponent(page.title.replace(' Style Analysis', ''))}&keywords=${encodeURIComponent(page.keywords.join(','))}&primary=${encodeURIComponent(page.colors.primary[0])}&bg=${encodeURIComponent(page.colors.background[0])}&confidence=90`],
    },
  };
}

export default function StyleSEOPage({ params }: Props) {
  return <StylePageClient />;
}
