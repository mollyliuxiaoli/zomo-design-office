'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

const STYLE_PAGES: Record<string, {
  title: string;
  description: string;
  keywords: string[];
  colors: { primary: string[]; secondary: string[]; background: string[] };
  font: string;
}> = {
  'linear-app': {
    title: 'Linear App Style',
    description: 'Complete visual style breakdown of Linear — dark-mode project management with purple accents, clean typography, and functional minimalism.',
    keywords: ['linear', 'project-management', 'dark-mode', 'purple', 'modern', 'minimal'],
    colors: { primary: ['#5E6AD2', '#8B5CF6'], secondary: ['#1C1C28', '#2B2B3D'], background: ['#0A0A0F', '#12121A'] },
    font: 'Inter',
  },
  'stripe': {
    title: 'Stripe Style',
    description: 'Complete visual style breakdown of Stripe — premium fintech design with purple gradients, professional typography, and polished UI.',
    keywords: ['stripe', 'fintech', 'gradients', 'purple', 'professional', 'premium'],
    colors: { primary: ['#635BFF', '#7C3AED'], secondary: ['#0A2540', '#425466'], background: ['#FFFFFF', '#F6F9FC'] },
    font: 'Inter',
  },
  'apple': {
    title: 'Apple.com Style',
    description: 'Complete visual style breakdown of Apple — industry-leading minimalism with SF Pro typography, generous spacing, and photography-forward design.',
    keywords: ['apple', 'minimal', 'clean', 'san-francisco', 'premium', 'photography'],
    colors: { primary: ['#0071E3', '#2997FF'], secondary: ['#1D1D1F', '#86868B'], background: ['#FFFFFF', '#F5F5F7'] },
    font: 'SF Pro',
  },
  'vercel': {
    title: 'Vercel Style',
    description: 'Complete visual style breakdown of Vercel — developer-focused dark theme with monospace accents and clean minimalism.',
    keywords: ['vercel', 'dark-theme', 'developer', 'monospace', 'clean', 'nextjs'],
    colors: { primary: ['#FFFFFF', '#0070F3'], secondary: ['#888888', '#666666'], background: ['#000000', '#111111'] },
    font: 'Inter',
  },
  'notion': {
    title: 'Notion Style',
    description: 'Complete visual style breakdown of Notion — warm, functional workspace design with clean typography and accessible colors.',
    keywords: ['notion', 'productivity', 'warm', 'clean', 'functional', 'typography'],
    colors: { primary: ['#000000', '#2EAADC'], secondary: ['#9B9A97', '#DFDED8'], background: ['#FFFFFF', '#FBFBFA'] },
    font: 'Inter',
  },
  'tailwind-css': {
    title: 'Tailwind CSS Style',
    description: 'Complete visual style breakdown of Tailwind CSS — vibrant gradients on dark background, developer-focused with bold color choices.',
    keywords: ['tailwind', 'css', 'developer', 'gradient', 'dark', 'vibrant'],
    colors: { primary: ['#38BDF8', '#818CF8'], secondary: ['#94A3B8', '#64748B'], background: ['#0F172A', '#1E293B'] },
    font: 'Inter',
  },
};

export default function StyleSEOClient() {
  const params = useParams();
  const slug = (Array.isArray(params.slug) ? params.slug[0] : params.slug) as string;
  const page = STYLE_PAGES[slug];

  if (!page) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Style not found</h1>
          <Link href="/" className="text-blue-600 underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title */}
        <h1 className="text-4xl font-bold text-black mb-4">{page.title}</h1>
        <p className="text-lg text-gray-600 mb-8">{page.description}</p>

        {/* Keywords */}
        <div className="flex flex-wrap gap-2 mb-8">
          {page.keywords.map((kw) => (
            <span key={kw} className="px-3 py-1 bg-black text-white text-sm rounded">{kw}</span>
          ))}
        </div>

        {/* Color Palette */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-black mb-4">色彩体系</h2>
          <div className="grid grid-cols-3 gap-6">
            {(['primary', 'secondary', 'background'] as const).map((key) => (
              <div key={key}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {key === 'primary' ? '主色' : key === 'secondary' ? '辅色' : '背景色'}
                </h3>
                <div className="flex gap-2">
                  {page.colors[key].map((color) => (
                    <div key={color} className="flex-1 h-16 rounded-lg border border-gray-200 flex items-end justify-center pb-1"
                      style={{ backgroundColor: color }}>
                      <span className="text-xs font-mono bg-white/80 px-1 rounded">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-black mb-4">排版</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-3xl font-bold mb-2" style={{ fontFamily: page.font }}>{page.font}</p>
            <p className="text-gray-500">Heading: Bold 700 | Body: Regular 400 | Scale: Balanced</p>
          </div>
        </div>

        {/* Style DNA Card */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-black mb-4">Style DNA Card</h2>
          <img
            src={`/api/og?title=${encodeURIComponent(page.title.replace(' Style', ''))}&keywords=${encodeURIComponent(page.keywords.join(','))}&primary=${encodeURIComponent(page.colors.primary[0])}&bg=${encodeURIComponent(page.colors.background[0])}&confidence=90&palette=${encodeURIComponent(page.colors.primary.concat(page.colors.secondary).join(','))}&vibe=${encodeURIComponent(page.description.slice(0, 80))}`}
            alt={`${page.title} DNA Card`}
            className="w-full rounded-xl border border-gray-200"
          />
        </div>

        {/* CTA */}
        <div className="text-center p-8 bg-gray-50 rounded-xl">
          <h3 className="text-xl font-bold text-black mb-2">提取任何网站的设计风格</h3>
          <p className="text-gray-600 mb-4">上传截图或输入 URL，AI 自动分析完整的视觉风格系统</p>
          <div className="flex gap-4 justify-center">
            <Link href="/analyze" className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800">
              免费开始分析
            </Link>
            <Link href="/library" className="border border-black text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-50">
              浏览风格库
            </Link>
          </div>
        </div>

        {/* Related Styles */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-black mb-4">更多风格分析</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(STYLE_PAGES)
              .filter(([s]) => s !== slug)
              .slice(0, 5)
              .map(([s, p]) => (
                <Link key={s} href={`/styles/${s}`} className="p-4 border border-gray-200 rounded-lg hover:border-black transition-colors">
                  <div className="flex gap-1 mb-2">
                    {p.colors.primary.slice(0, 2).map((c) => (
                      <div key={c} className="w-6 h-6 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="font-medium text-sm">{p.title}</p>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
