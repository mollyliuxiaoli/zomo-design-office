import type { Metadata } from 'next';
import Gallery from './Gallery';

const domain = process.env.NEXT_PUBLIC_BRAND_DOMAIN || 'distill.style';

export const metadata: Metadata = {
  title: 'Showcase',
  description: 'Explore design styles extracted from the world\'s best websites. Tailwind configs, CSS variables, and AI prompts ready to use.',
  alternates: { canonical: `https://${domain}/showcase` },
  openGraph: {
    title: 'Distill Showcase — Design Style Gallery',
    description: 'Explore design styles from the world\'s best websites.',
    url: `https://${domain}/showcase`,
  },
};

export default function ShowcasePage() {
  return <Gallery />;
}
