'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

type StylePage = {
  title: string;
  description: string;
  keywords: string[];
  colors: { primary: string[]; secondary: string[]; background: string[] };
  font: string;
  formula: string;
  bestFor: string[];
  avoid: string[];
  tokens: {
    spacing: string[];
    radius: string[];
    surface: string;
    border: string;
    text: string;
  };
  components: {
    button: string;
    card: string;
    navigation: string;
  };
  metrics: {
    minimalism: number;
    density: number;
    colorRestraint: number;
    brandAccent: number;
  };
};

const STYLE_PAGES: Record<string, StylePage> = {
  'linear-app': {
    title: 'Linear App Style',
    description: 'A functional dark product UI system built from layered charcoal surfaces, restrained purple-blue accents, compact Inter typography, and almost no decorative noise.',
    keywords: ['linear', 'project-management', 'dark-mode', 'purple', 'modern', 'minimal'],
    colors: { primary: ['#5E6AD2', '#8B5CF6'], secondary: ['#1C1C28', '#2B2B3D'], background: ['#0A0A0F', '#12121A'] },
    font: 'Inter',
    formula: 'Layered dark surfaces + one blue-purple accent + compact product density + subtle borders instead of heavy shadows.',
    bestFor: ['Project management', 'Developer tools', 'Issue trackers', 'Dense SaaS dashboards'],
    avoid: ['Cyberpunk glow', 'large gradients', 'playful illustration', 'oversized marketing type'],
    tokens: { spacing: ['4px', '8px', '12px', '16px', '24px', '32px'], radius: ['6px', '8px', '12px', '999px'], surface: '#12121A', border: '#2B2B3D', text: '#F5F5F7' },
    components: {
      button: 'Compact height, pill/subtle radius, single accent fill for primary actions, muted surface for secondary actions.',
      card: 'Low-contrast elevated surface, hairline border, minimal shadow, dense internal spacing.',
      navigation: 'Dark rail or topbar, small labels, active item indicated by accent tint rather than large blocks.',
    },
    metrics: { minimalism: 92, density: 86, colorRestraint: 88, brandAccent: 76 },
  },
  stripe: {
    title: 'Stripe Style',
    description: 'A premium fintech marketing system using crisp white surfaces, confident navy text, violet gradients, and polished enterprise proof points.',
    keywords: ['stripe', 'fintech', 'gradients', 'purple', 'professional', 'premium'],
    colors: { primary: ['#635BFF', '#7C3AED'], secondary: ['#0A2540', '#425466'], background: ['#FFFFFF', '#F6F9FC'] },
    font: 'Inter',
    formula: 'Clean white infrastructure + navy editorial hierarchy + violet gradient accents + highly polished product proof.',
    bestFor: ['Fintech', 'API infrastructure', 'B2B SaaS', 'Enterprise conversion pages'],
    avoid: ['Casual copy', 'low-contrast gray text', 'messy gradients', 'too many competing CTAs'],
    tokens: { spacing: ['8px', '12px', '16px', '24px', '40px', '64px'], radius: ['4px', '8px', '12px', '24px'], surface: '#FFFFFF', border: '#D9E2EF', text: '#0A2540' },
    components: {
      button: 'Confident primary fill, subtle gradient or shadow, compact but premium padding.',
      card: 'White cards on pale blue-gray background with precise borders and layered diagrams.',
      navigation: 'Dense but calm top nav with product groups and a clear primary action.',
    },
    metrics: { minimalism: 72, density: 68, colorRestraint: 70, brandAccent: 92 },
  },
  apple: {
    title: 'Apple.com Style',
    description: 'A photography-led premium consumer system with extreme whitespace, quiet typography, direct copy, and almost invisible interface chrome.',
    keywords: ['apple', 'minimal', 'clean', 'san-francisco', 'premium', 'photography'],
    colors: { primary: ['#0071E3', '#2997FF'], secondary: ['#1D1D1F', '#86868B'], background: ['#FFFFFF', '#F5F5F7'] },
    font: 'SF Pro',
    formula: 'Generous whitespace + product photography + short confident copy + blue links used sparingly.',
    bestFor: ['Consumer hardware', 'Premium apps', 'Launch pages', 'Photography-led storytelling'],
    avoid: ['Dense dashboards', 'many cards', 'noisy gradients', 'long explanatory paragraphs'],
    tokens: { spacing: ['12px', '20px', '32px', '48px', '72px', '96px'], radius: ['12px', '18px', '24px', '32px'], surface: '#F5F5F7', border: '#D2D2D7', text: '#1D1D1F' },
    components: {
      button: 'Minimal pill buttons, clear blue link actions, large touch targets.',
      card: 'Soft large-radius sections with product imagery and very little border treatment.',
      navigation: 'Ultra-thin global nav, small labels, product-first hierarchy.',
    },
    metrics: { minimalism: 96, density: 28, colorRestraint: 94, brandAccent: 66 },
  },
  vercel: {
    title: 'Vercel Style',
    description: 'A developer-first black-and-white system with monochrome restraint, sharp contrast, monospace accents, and deployment-console credibility.',
    keywords: ['vercel', 'dark-theme', 'developer', 'monospace', 'clean', 'nextjs'],
    colors: { primary: ['#FFFFFF', '#0070F3'], secondary: ['#888888', '#666666'], background: ['#000000', '#111111'] },
    font: 'Inter',
    formula: 'Monochrome foundation + sharp developer typography + tiny blue focus accents + terminal-like proof.',
    bestFor: ['Developer platforms', 'Cloud infrastructure', 'CLI tools', 'Technical documentation'],
    avoid: ['Decorative illustration', 'warm consumer palettes', 'soft playful cards', 'marketing fluff'],
    tokens: { spacing: ['4px', '8px', '16px', '24px', '32px', '48px'], radius: ['2px', '6px', '8px', '999px'], surface: '#111111', border: '#2A2A2A', text: '#FAFAFA' },
    components: {
      button: 'High-contrast black/white controls with exact borders and rare blue highlights.',
      card: 'Thin border cards, terminal/code blocks, direct product screenshots.',
      navigation: 'Minimal top nav with strong type contrast and restrained developer affordances.',
    },
    metrics: { minimalism: 94, density: 74, colorRestraint: 98, brandAccent: 58 },
  },
  notion: {
    title: 'Notion Style',
    description: 'A warm productivity UI system with document-like surfaces, soft neutrals, human copy, and functional low-friction organization.',
    keywords: ['notion', 'productivity', 'warm', 'clean', 'functional', 'typography'],
    colors: { primary: ['#000000', '#2EAADC'], secondary: ['#9B9A97', '#DFDED8'], background: ['#FFFFFF', '#FBFBFA'] },
    font: 'Inter',
    formula: 'Document canvas + warm gray neutrals + tiny blue interaction accents + block-based content rhythm.',
    bestFor: ['Productivity apps', 'Knowledge bases', 'Document tools', 'Workspace products'],
    avoid: ['High saturation palettes', 'heavy shadows', 'complex chrome', 'corporate-blue SaaS clichés'],
    tokens: { spacing: ['4px', '8px', '12px', '16px', '24px', '40px'], radius: ['3px', '6px', '8px', '12px'], surface: '#FBFBFA', border: '#E9E9E7', text: '#37352F' },
    components: {
      button: 'Quiet neutral buttons with lightweight hover states and document-like density.',
      card: 'Block/content cards, almost flat surfaces, subtle borders only when needed.',
      navigation: 'Sidebar hierarchy, compact rows, emoji/icon affordances used sparingly.',
    },
    metrics: { minimalism: 86, density: 72, colorRestraint: 91, brandAccent: 42 },
  },
  'tailwind-css': {
    title: 'Tailwind CSS Style',
    description: 'A vibrant developer education system with dark navy surfaces, cyan-to-indigo gradients, code-forward examples, and energetic documentation rhythm.',
    keywords: ['tailwind', 'css', 'developer', 'gradient', 'dark', 'vibrant'],
    colors: { primary: ['#38BDF8', '#818CF8'], secondary: ['#94A3B8', '#64748B'], background: ['#0F172A', '#1E293B'] },
    font: 'Inter',
    formula: 'Dark documentation canvas + cyan/indigo gradient accents + code examples + utility-first clarity.',
    bestFor: ['Developer education', 'CSS tools', 'Docs landing pages', 'Template marketplaces'],
    avoid: ['Enterprise stiffness', 'muddy colors', 'overly muted CTAs', 'dense corporate diagrams'],
    tokens: { spacing: ['4px', '8px', '12px', '16px', '24px', '40px'], radius: ['6px', '10px', '16px', '24px'], surface: '#1E293B', border: '#334155', text: '#E2E8F0' },
    components: {
      button: 'Bright gradient or cyan action, dark code-adjacent secondary buttons.',
      card: 'Dark elevated cards with gradient highlights and code snippets.',
      navigation: 'Docs-style nav with search, direct links, and visible community/dev affordances.',
    },
    metrics: { minimalism: 68, density: 78, colorRestraint: 54, brandAccent: 94 },
  },
};

function cssVariablesFor(page: StylePage): string {
  return `:root {\n  --color-bg: ${page.colors.background[0]};\n  --color-surface: ${page.tokens.surface};\n  --color-surface-2: ${page.colors.secondary[0]};\n  --color-border: ${page.tokens.border};\n  --color-text: ${page.tokens.text};\n  --color-muted: ${page.colors.secondary[1]};\n  --color-primary: ${page.colors.primary[0]};\n  --color-accent: ${page.colors.primary[1]};\n  --font-sans: ${page.font}, ui-sans-serif, system-ui;\n  --space-1: ${page.tokens.spacing[0]};\n  --space-2: ${page.tokens.spacing[1]};\n  --space-3: ${page.tokens.spacing[2]};\n  --space-4: ${page.tokens.spacing[3]};\n  --radius-sm: ${page.tokens.radius[0]};\n  --radius-md: ${page.tokens.radius[1]};\n  --radius-lg: ${page.tokens.radius[2]};\n}`;
}

function metricLabel(key: string): string {
  return {
    minimalism: 'Minimalism',
    density: 'Functional density',
    colorRestraint: 'Color restraint',
    brandAccent: 'Brand accent',
  }[key] || key;
}

export default function StyleSEOClient() {
  const params = useParams();
  const slug = (Array.isArray(params.slug) ? params.slug[0] : params.slug) as string;
  const page = STYLE_PAGES[slug];

  if (!page) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] text-zinc-950">
        <Navigation />
        <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Style report</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950">Style not found</h1>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white">
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  const palette = [...page.colors.primary, ...page.colors.secondary, ...page.colors.background];
  const cssVariables = cssVariablesFor(page);
  const metrics = Object.entries(page.metrics);
  const related = Object.entries(STYLE_PAGES).filter(([s]) => s !== slug).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white/85 shadow-[0_24px_80px_rgba(24,24,27,0.08)]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                  Design Token Report
                </span>
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                  HIGH 90% confidence
                </span>
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-zinc-950 sm:text-6xl">
                {page.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
                {page.description}
              </p>

              <div className="mt-6 rounded-3xl border border-zinc-200 bg-[#f7f4ee] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Core visual formula</p>
                <p className="mt-2 text-xl font-black leading-snug tracking-tight text-zinc-950">{page.formula}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {page.keywords.map((kw) => (
                  <span key={kw} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="rounded-[1.75rem] border p-5 shadow-2xl"
              style={{
                background: `radial-gradient(circle at 20% 0%, ${page.colors.primary[1]}55, transparent 28%), linear-gradient(135deg, ${page.colors.background[0]}, ${page.colors.background[1]})`,
                borderColor: page.tokens.border,
                color: page.tokens.text,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-60">Style DNA</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">{page.title.replace(' Style', '')}</h2>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: `${page.colors.primary[0]}22`, color: page.colors.primary[0] }}>
                  90% match
                </span>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {palette.slice(0, 6).map((color, index) => (
                  <div key={`${color}-${index}`} className="rounded-2xl border p-3" style={{ borderColor: page.tokens.border, backgroundColor: `${page.tokens.surface}CC` }}>
                    <div className="h-14 rounded-xl border" style={{ backgroundColor: color, borderColor: `${page.tokens.border}99` }} />
                    <p className="mt-2 font-mono text-xs opacity-80">{color}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: page.tokens.border, backgroundColor: `${page.tokens.surface}DD` }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: page.tokens.border }}>
                  <span className="text-sm font-bold">Component sample</span>
                  <span className="rounded-full px-2 py-1 text-xs" style={{ backgroundColor: page.colors.primary[0], color: page.tokens.text }}>Active</span>
                </div>
                <div className="mt-4 space-y-3 text-sm opacity-85">
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: page.tokens.border }}>
                    <span>Primary action</span>
                    <span className="font-mono text-xs">{page.tokens.radius[1]}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: page.tokens.border }}>
                    <span>Surface layer</span>
                    <span className="font-mono text-xs">{page.tokens.surface}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Palette tokens</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">色彩体系与使用语义</h2>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">{palette.length} colors</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Primary accent', page.colors.primary[0], 'CTA / active / focus ring'],
                  ['Secondary accent', page.colors.primary[1], 'hover / gradient / highlights'],
                  ['Surface', page.tokens.surface, 'cards / panels / elevated layers'],
                  ['Border', page.tokens.border, 'hairline dividers / subtle chrome'],
                  ['Background', page.colors.background[0], 'page canvas / app shell'],
                  ['Text', page.tokens.text, 'primary readable foreground'],
                ].map(([name, value, usage]) => (
                  <div key={name} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200" style={{ backgroundColor: value }} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-950">{name}</p>
                      <p className="font-mono text-xs text-zinc-500">{value}</p>
                      <p className="text-xs leading-5 text-zinc-500">{usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Style metrics</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">风格评分维度</h2>
              <div className="mt-5 space-y-4">
                {metrics.map(([key, value]) => (
                  <div key={key}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-zinc-700">{metricLabel(key)}</span>
                      <span className="font-mono text-xs text-zinc-500">{value}/100</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: page.colors.primary[0] }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Do / Don’t</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">复刻注意事项</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
                  <p className="font-black">Do</p>
                  <ul className="mt-3 space-y-2">
                    {page.bestFor.map((item) => <li key={item}>✓ {item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-950">
                  <p className="font-black">Don’t</p>
                  <ul className="mt-3 space-y-2">
                    {page.avoid.map((item) => <li key={item}>× {item}</li>)}
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <div className="min-w-0 space-y-6">
            <section className="rounded-[1.75rem] border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Copy-ready implementation</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">CSS Variables</h2>
                </div>
                <Link href="/analyze" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-zinc-200">
                  上传截图生成 Tokens
                </Link>
              </div>
              <pre className="mt-5 max-h-[460px] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-sm leading-6 text-zinc-200">
                <code>{cssVariables}</code>
              </pre>
            </section>

            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Component rules</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">组件级复刻规则</h2>
              <div className="mt-5 grid gap-3">
                {Object.entries(page.components).map(([name, desc]) => (
                  <div key={name} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">{name}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Typography / spacing</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">排版、间距、圆角</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Font</p>
                  <p className="mt-2 text-2xl font-black" style={{ fontFamily: page.font }}>{page.font}</p>
                  <p className="mt-1 text-xs text-zinc-500">700 heading / 400 body</p>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Spacing</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {page.tokens.spacing.map((space) => <span key={space} className="rounded-full bg-white px-2 py-1 font-mono text-xs text-zinc-600">{space}</span>)}
                  </div>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Radius</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {page.tokens.radius.map((radius) => <span key={radius} className="rounded-full bg-white px-2 py-1 font-mono text-xs text-zinc-600">{radius}</span>)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Recreate from your own reference</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">把任意截图变成可复刻设计系统</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            上传截图或输入公开网站，Zomo 会输出色彩、排版、间距、组件规则、CSS/Tailwind/shadcn 主题和复刻提示词。
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/analyze" className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-black text-white hover:bg-zinc-800">
              生成我的 Design Token Report
            </Link>
            <Link href="/library" className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-black text-zinc-950 hover:bg-zinc-50">
              浏览风格库
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">更多风格分析</h2>
            <Link href="/library" className="text-sm font-bold text-zinc-600 hover:text-zinc-950">查看全部 →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {related.map(([s, p]) => (
              <Link key={s} href={`/styles/${s}`} className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-950">
                <div className="flex gap-1.5">
                  {p.colors.primary.concat(p.colors.background.slice(0, 1)).map((c) => (
                    <div key={c} className="h-7 flex-1 rounded-full border border-zinc-200" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="mt-4 text-sm font-black text-zinc-950 group-hover:underline">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{p.formula}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
