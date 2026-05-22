'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from './components/Navigation';
import { styleRepo } from './lib/storage/repo';
import type { LibraryRecord } from './lib/storage/db';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from './lib/ai-client';

interface DemoStyle {
  id: string;
  title: string;
  thumbnailUrl: string;
  source: { type: string; label: string };
  spec: StyleSpecV1Input;
}

function getPrimaryColor(spec: StyleSpecV1Input): string {
  return spec.colors?.primary?.[0] || '#09090b';
}

function getBgColor(spec: StyleSpecV1Input): string {
  return spec.colors?.background?.[0] || '#ffffff';
}

function getPalette(spec: StyleSpecV1Input): string[] {
  return [
    ...(spec.colors?.primary || []),
    ...(spec.colors?.secondary || []),
    ...(spec.colors?.accent || []),
    ...(spec.colors?.background || []),
  ].filter(Boolean).slice(0, 5);
}

const STATS = [
  { label: '分析维度', value: '30+', detail: '色彩 / 字体 / 布局 / 组件' },
  { label: '导出格式', value: '7', detail: 'CSS · Tailwind · shadcn · Prompt' },
  { label: '开始门槛', value: '0', detail: '无需注册，上传即可试' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: '输入截图或网站',
    desc: '上传界面截图、粘贴图片直链，或输入可公开访问的网站 URL。',
    hint: 'PNG / JPG / WebP / URL',
  },
  {
    step: '02',
    title: '拆解视觉 DNA',
    desc: '提取颜色、字体、间距、圆角、阴影、布局结构和组件语言。',
    hint: 'Tokens / Layout / Components',
  },
  {
    step: '03',
    title: '导出复刻提示词',
    desc: '生成 CSS 变量、Tailwind 配置、shadcn 主题和可复用还原 Prompt。',
    hint: 'CSS / Config / Prompt',
  },
];

const TOKEN_PREVIEW = [
  { label: 'primary', value: '#5E6AD2', color: '#5E6AD2' },
  { label: 'surface', value: '#0A0A0A', color: '#0A0A0A' },
  { label: 'radius', value: '8px', color: '#F4F4F5' },
  { label: 'font', value: 'Inter / 600', color: '#FFFFFF' },
];

const EXPORT_LINES = [
  '--primary: 245 62% 60%;',
  '--radius: 0.75rem;',
  'font: Inter / tight;',
  'density: compact;',
];

export default function Home() {
  const [styles, setStyles] = useState<LibraryRecord[]>([]);
  const [demoStyles, setDemoStyles] = useState<DemoStyle[]>([]);

  useEffect(() => {
    void loadStyles();
    void loadDemoStyles();
  }, []);

  const loadDemoStyles = async () => {
    try {
      const res = await fetch('/demo-styles/index.json');
      if (res.ok) setDemoStyles(await res.json());
    } catch { /* non-critical */ }
  };

  const loadStyles = async () => {
    try {
      setStyles(await styleRepo.listAll());
    } catch (err) {
      console.error('[distill] Failed to load styles:', err);
    }
  };

  const openDemoStyle = async (demo: DemoStyle) => {
    try {
      const fullSpec = withDerived(normalizeSpec(demo.spec));
      const record: LibraryRecord = {
        id: demo.id,
        spec: fullSpec,
        source: { type: 'demo', label: demo.source.label },
        title: demo.title,
        thumbnailUrl: demo.thumbnailUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visibility: 'private',
      };
      await styleRepo.save(record);
      window.location.href = `/style/${demo.id}`;
    } catch (err) {
      console.error('[distill] Failed to save demo style:', err);
    }
  };

  const hasUserStyles = styles.length > 0;

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <Navigation />

      <section className="relative overflow-hidden border-b border-zinc-200/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(190,18,60,0.10),transparent_26%),linear-gradient(135deg,#fafafa_0%,#ffffff_42%,#f4f4f5_100%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#09090b_1px,transparent_1px),linear-gradient(90deg,#09090b_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
          <div className="text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/75 px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              Visual Style Compiler
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.07em] text-zinc-950 [word-break:keep-all] sm:text-6xl lg:text-7xl">
              截图 → 完整设计系统
            </h1>
            <p className="mt-6 max-w-[64ch] text-lg leading-8 text-zinc-600 sm:text-xl">
              上传截图或输入网站 URL，把页面反向拆解成颜色、字体、间距、组件语言和可复刻提示词。
              设计师看风格，前端拿配置，AI 直接拿 Prompt。
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-zinc-950/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 active:scale-[0.98]"
              >
                上传截图开始分析
              </Link>
              <Link
                href="/styles/linear-app"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white/80 px-7 py-4 text-base font-semibold text-zinc-950 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 active:scale-[0.98]"
              >
                查看完整输出示例 →
              </Link>
            </div>
            <p className="mt-4 text-sm text-zinc-500">无需注册 · 支持截图/URL · 约 30-60 秒生成可复制结果</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <div className="font-mono text-2xl font-bold tracking-tight text-zinc-950">{s.value}</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-800">{s.label}</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-500">{s.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-8 hidden h-28 w-28 rounded-full bg-rose-500/10 blur-3xl lg:block" />
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-3 shadow-2xl shadow-zinc-950/10">
              <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-950 p-4 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    reverse-engineering preview
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-1 font-mono text-[11px] text-zinc-300">confidence 95%</span>
                </div>

                <div className="grid gap-3 py-4 sm:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
                      <span>source screenshot</span>
                      <span>1440px</span>
                    </div>
                    <div className="space-y-2 rounded-xl bg-[#111111] p-3">
                      <div className="h-3 w-20 rounded-full bg-white/20" />
                      <div className="h-14 rounded-xl bg-gradient-to-br from-[#5e6ad2] to-[#111111]" />
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-12 rounded-lg bg-white/10" />
                        <div className="h-12 rounded-lg bg-white/10" />
                        <div className="h-12 rounded-lg bg-white/10" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white p-4 text-zinc-950">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">extracted dna</div>
                        <div className="mt-1 text-xl font-bold tracking-tight">Linear-like system</div>
                      </div>
                      <div className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">ready</div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {TOKEN_PREVIEW.map((token) => (
                        <div key={token.label} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full border border-zinc-300" style={{ backgroundColor: token.color }} />
                            <span className="text-xs text-zinc-500">{token.label}</span>
                          </div>
                          <div className="truncate font-mono text-xs font-semibold text-zinc-900">{token.value}</div>
                        </div>
                      ))}
                    </div>

                    <pre className="mt-4 overflow-hidden rounded-xl bg-zinc-950 p-3 text-xs leading-6 text-zinc-200">
                      {EXPORT_LINES.map((line) => <code key={line} className="block">{line}</code>)}
                    </pre>
                  </div>
                </div>

                <div className="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-3">
                  {['Copy CSS', 'Copy Tailwind', 'Copy Prompt'].map((label) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300">
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-700">workflow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">三步把截图变成可复用资产</h2>
            </div>
            <p className="max-w-xl text-zinc-600">不是只给一句“风格很高级”，而是把视觉判断拆成可复制、可导出、可复刻的设计资料。</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, index) => (
              <div key={item.step} className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute -right-6 top-1/2 z-10 hidden h-px w-8 bg-zinc-300 md:block" />
                )}
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-rose-700">{item.step}</span>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">{item.hint}</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-950">{item.title}</h3>
                <p className="mt-3 leading-7 text-zinc-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-700">case library</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">经典风格不是色块，而是一组可复用规则</h2>
          </div>
          <p className="max-w-xl text-zinc-600">每个案例展示提取出的颜色、字体、密度、圆角和语气关键词，点击后可查看完整风格分析。</p>
        </div>

        {demoStyles.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {demoStyles.map((demo, index) => {
              const primary = getPrimaryColor(demo.spec);
              const bg = getBgColor(demo.spec);
              const keywords = demo.spec.vibe?.keywords || [];
              const palette = getPalette(demo.spec);
              const isFeatured = index === 0;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => void openDemoStyle(demo)}
                  className={`group text-left rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 ${isFeatured ? 'md:col-span-2' : ''}`}
                >
                  <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-200 p-4" style={{ backgroundColor: bg }}>
                    <div className="flex h-full flex-col justify-between rounded-xl border border-white/20 p-4" style={{ background: `linear-gradient(135deg, ${primary}26 0%, rgba(255,255,255,0.10) 100%)` }}>
                      <span className="w-fit rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-zinc-700 backdrop-blur">{demo.spec.spacing?.density || 'balanced'}</span>
                      <span className="text-2xl font-black tracking-tight" style={{ color: primary }}>{demo.title}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-zinc-950">{demo.title}</h3>
                      <span className="text-sm font-semibold text-zinc-500 transition group-hover:text-zinc-950">查看分析 →</span>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-[3.5rem] text-sm leading-7 text-zinc-600">{demo.spec.vibe?.description}</p>

                    <div className="mt-4 flex gap-1.5">
                      {palette.map((color) => (
                        <span key={`${demo.id}-${color}`} className="h-6 flex-1 rounded-lg border border-zinc-200" style={{ backgroundColor: color }} title={color} />
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-zinc-50 p-2">
                        <div className="text-zinc-400">字体</div>
                        <div className="mt-1 truncate font-semibold text-zinc-800">{demo.spec.typography?.scale || 'balanced'}</div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 p-2">
                        <div className="text-zinc-400">圆角</div>
                        <div className="mt-1 truncate font-semibold text-zinc-800">{demo.spec.radius?.values?.[0] || '8px'}</div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 p-2">
                        <div className="text-zinc-400">阴影</div>
                        <div className="mt-1 truncate font-semibold text-zinc-800">{demo.spec.shadow?.style || 'soft'}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {keywords.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">{tag}</span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-zinc-500">正在加载示例风格…</div>
        )}
      </section>

      {hasUserStyles && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-700">your analysis</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">我的分析</h2>
            </div>
            {styles.length > 6 && <Link href="/library" className="text-sm font-semibold text-zinc-950 hover:underline">查看全部 →</Link>}
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {styles.slice(0, 6).map((style) => (
              <Link key={style.id} href={`/style/${style.id}`} className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="aspect-[4/3] overflow-hidden bg-zinc-100">
                  {style.thumbnailUrl ? (
                    <img src={style.thumbnailUrl} alt={style.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: String(style.spec?.colors?.background?.[0] || '#f5f5f5') }}>
                      <span className="text-3xl font-black" style={{ color: String(style.spec?.colors?.primary?.[0] || '#000') }}>{String(style.title || '').charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-zinc-950">{String(style.title || 'Untitled')}</h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(Array.isArray(style.spec?.vibe?.keywords) ? style.spec.vibe.keywords : []).slice(0, 3).map((tag: unknown, i: number) => (
                      <span key={i} className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{String(tag)}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-zinc-950 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-300">ready to distill</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">把下一张参考图变成你的复刻说明书</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-400">免费试用，无需注册。上传截图后即可获得可复制的设计 token、代码配置和 AI 还原提示词。</p>
          <Link
            href="/analyze"
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-base font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
          >
            上传截图开始分析 →
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-zinc-50 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
          <span className="font-semibold text-zinc-950">Distill</span>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/analyze" className="hover:text-zinc-950">分析</Link>
            <Link href="/library" className="hover:text-zinc-950">风格库</Link>
            <Link href="/styles/linear-app" className="hover:text-zinc-950">示例</Link>
            <Link href="/compare" className="hover:text-zinc-950">对比</Link>
          </div>
          <span>Visual Style Compiler</span>
        </div>
      </footer>
    </div>
  );
}
