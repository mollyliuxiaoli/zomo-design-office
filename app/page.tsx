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
  return spec.colors?.primary?.[0] || '#000000';
}
function getBgColor(spec: StyleSpecV1Input): string {
  return spec.colors?.background?.[0] || '#ffffff';
}

const STATS = [
  { label: '设计风格分析', value: '30+' },
  { label: '输出格式', value: '7种' },
  { label: 'AI 模型', value: 'Gemini' },
];

const HOW_IT_WORKS = [
  { step: '1', title: '上传截图或输入 URL', desc: '支持任何网站截图、设计稿、App 界面' },
  { step: '2', title: 'AI 分析视觉系统', desc: 'Gemini 自动提取色彩、排版、布局、组件风格' },
  { step: '3', title: '获取可用的代码', desc: 'CSS 变量、Tailwind 配置、shadcn/ui 主题、AI Prompt' },
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

  const hasUserStyles = styles.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero - LEFT-ALIGNED Asymmetric */}
      <section className="relative overflow-hidden min-h-[100dvh]">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-100" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[80dvh]">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white text-sm rounded-full mb-6">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Visual Style Compiler
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-zinc-950 mb-6 leading-none tracking-tighter">
                截图 → 完整设计系统
              </h1>
              <p className="text-lg text-zinc-600 max-w-[65ch] mb-10 leading-relaxed">
                上传任何设计截图，AI 自动提取色彩、排版、布局风格。
                一键导出 Tailwind 配置、CSS 变量、shadcn/ui 主题。
              </p>
              <div className="flex gap-4 mb-12">
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 bg-zinc-950 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-zinc-800 transition-colors shadow-lg active:scale-[0.98]"
                >
                  免费分析截图
                </Link>
                <Link
                  href="/styles/linear-app"
                  className="inline-flex items-center gap-2 bg-white text-zinc-950 border-2 border-zinc-200 px-8 py-4 rounded-xl font-semibold text-lg hover:border-zinc-950 transition-colors active:scale-[0.98]"
                >
                  查看示例 →
                </Link>
              </div>

              {/* Stats bar - with monospace numbers */}
              <div className="flex gap-8 text-sm text-zinc-500">
                {STATS.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-950 text-lg">{s.value}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Empty for now or could add a visual element */}
            <div className="hidden lg:block"></div>
          </div>
        </div>
      </section>

      {/* How It Works - ASYMMETRIC Zigzag Layout */}
      <section className="bg-zinc-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-zinc-950 mb-12">三步获取设计系统</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {HOW_IT_WORKS.map((item, index) => (
              <div
                key={item.step}
                className={`flex gap-6 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''} items-start`}
              >
                <div className="w-16 h-16 bg-zinc-950 text-white rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-950 mb-2">{item.title}</h3>
                  <p className="text-zinc-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Gallery - ASYMMETRIC Masonry Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-950 mb-2">经典设计风格</h2>
          <p className="text-zinc-600">点击任意卡片查看完整风格分析</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr">
          {demoStyles.map((demo, index) => {
            const primary = getPrimaryColor(demo.spec);
            const bg = getBgColor(demo.spec);
            const keywords = demo.spec.vibe?.keywords || [];
            // Make first item span 2 columns for asymmetric look
            const isFeatured = index === 0;
            return (
              <div
                key={demo.id}
                className={`group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-zinc-300 transition-all cursor-pointer ${isFeatured ? 'md:col-span-2' : ''}`}
                onClick={async () => {
                  try {
                    const fullSpec = withDerived(normalizeSpec(demo.spec));
                    const record: LibraryRecord = {
                      id: demo.id,
                      spec: fullSpec,
                      source: { type: 'demo', label: demo.source.label },
                      title: demo.title,
                      thumbnailUrl: '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      visibility: 'private',
                    };
                    await styleRepo.save(record);
                    window.location.href = `/style/${demo.id}`;
                  } catch (err) {
                    console.error('[distill] Failed to save demo style:', err);
                  }
                }}
              >
                <div className="aspect-[16/10] flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: bg }}>
                  <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${bg} 100%)` }} />
                  <span className="text-lg font-bold relative z-10" style={{ color: primary }}>{demo.title}</span>
                </div>
                <div className="p-3">
                  <div className="flex gap-1 mb-2">
                    {keywords.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* User Styles */}
      {hasUserStyles && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <h2 className="text-2xl font-bold text-zinc-950 mb-4">我的分析</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {styles.slice(0, 6).map((style) => (
              <Link key={style.id} href={`/style/${style.id}`} className="group bg-white border border-zinc-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[4/3] bg-zinc-100 relative overflow-hidden">
                  {style.thumbnailUrl ? (
                    <img src={style.thumbnailUrl} alt={style.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: String(style.spec?.colors?.background?.[0] || '#f5f5f5') }}>
                      <span className="text-2xl font-bold" style={{ color: String(style.spec?.colors?.primary?.[0] || '#000') }}>{String(style.title || '').charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{String(style.title || 'Untitled')}</h3>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(style.spec?.vibe?.keywords) ? style.spec.vibe.keywords : []).slice(0, 3).map((tag: unknown, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded">{String(tag)}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {styles.length > 6 && (
            <div className="text-center mt-6">
              <Link href="/library" className="text-zinc-950 font-medium hover:underline">查看全部 →</Link>
            </div>
          )}
        </section>
      )}

      {/* CTA - Premium style with Zinc-950 instead of pure black */}
      <section className="bg-zinc-950 text-white py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">开始提取设计 DNA</h2>
          <p className="text-zinc-400 mb-8 text-lg">免费，无需注册，上传即可分析</p>
          <Link
            href="/analyze"
            className="inline-block bg-white text-zinc-950 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-zinc-100 transition-colors active:scale-[0.98]"
          >
            上传截图 →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-50 border-t border-zinc-200 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
          <span className="font-semibold text-zinc-950">Distill</span>
          <div className="flex gap-6">
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
