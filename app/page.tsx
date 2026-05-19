'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from './components/Navigation';
import { styleRepo } from './lib/storage/repo';
import type { LibraryRecord } from './lib/storage/db';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from './lib/ai-client';

const STYLE_TAGS = ['Minimalist', 'Brutalist', 'Editorial', 'Corporate', 'Playful', 'Luxury', 'Retro', 'Futuristic', 'Organic', 'Swiss'];

interface DemoStyle {
  id: string;
  title: string;
  thumbnailUrl: string;
  source: { type: string; label: string };
  spec: StyleSpecV1Input;
}

// Color palette preview for demo cards without real thumbnails
function getPrimaryColor(spec: StyleSpecV1Input): string {
  return spec.colors?.primary?.[0] || '#000000';
}

function getBgColor(spec: StyleSpecV1Input): string {
  return spec.colors?.background?.[0] || '#ffffff';
}

export default function Home() {
  const [styles, setStyles] = useState<LibraryRecord[]>([]);
  const [demoStyles, setDemoStyles] = useState<DemoStyle[]>([]);
  const [selectedStyleTag, setSelectedStyleTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStyles();
    void loadDemoStyles();
  }, []);

  const loadDemoStyles = async () => {
    try {
      const res = await fetch('/demo-styles/index.json');
      if (res.ok) {
        const demos: DemoStyle[] = await res.json();
        setDemoStyles(demos);
      }
    } catch { /* non-critical */ }
  };

  const loadStyles = async () => {
    try {
      const savedStyles = await styleRepo.listAll();
      setStyles(savedStyles);
      setError(null);
    } catch (err) {
      console.error('[distill] Failed to load styles:', err);
      setError('加载风格库失败，请刷新页面重试');
    }
  };

  const filteredStyles = styles.filter(style => {
    if (selectedStyleTag && !style.spec.vibe.keywords.includes(selectedStyleTag)) return false;
    return true;
  });

  const filteredDemos = demoStyles.filter(d => {
    if (selectedStyleTag && !d.spec.vibe?.keywords?.includes(selectedStyleTag)) return false;
    return true;
  });

  const hasUserStyles = styles.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">
            Distill
          </h1>
          <p className="text-2xl text-gray-600 mb-6">
            Decode design, distill style.
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
            Extract design DNA from any website or image. Get Tailwind configs, CSS variables, and AI prompts.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/analyze"
              className="inline-block bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Start Analyzing
            </Link>
            <Link
              href="/showcase"
              className="inline-block bg-white text-black border border-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              View Showcase
            </Link>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Filter Tags */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">风格分类</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedStyleTag(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedStyleTag === null
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {STYLE_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedStyleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedStyleTag === tag
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* User Styles Grid */}
        {hasUserStyles && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-black mb-4">我的风格</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStyles.map(style => (
                <Link
                  key={style.id}
                  href={`/style/${style.id}`}
                  className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    <img
                      src={style.thumbnailUrl}
                      alt={style.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{style.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {style.spec.vibe.keywords.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Demo Gallery */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-2">
            {hasUserStyles ? '灵感库' : '选择一个风格作为起点'}
          </h2>
          <p className="text-gray-500 mb-4">
            {hasUserStyles
              ? '探索经典设计风格，提取其设计 DNA'
              : '这些是经典网站的设计风格。点击任意卡片查看提取的风格信息。'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDemos.map(demo => {
              const primary = getPrimaryColor(demo.spec);
              const bg = getBgColor(demo.spec);
              const keywords = demo.spec.vibe?.keywords || [];
              return (
                <div
                  key={demo.id}
                  className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:border-gray-300 cursor-pointer"
                  onClick={async () => {
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
                  }}
                >
                  <div
                    className="aspect-[16/10] flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: bg }}
                  >
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `linear-gradient(135deg, ${primary} 0%, ${bg} 100%)`,
                      }}
                    />
                    <span className="text-xl font-bold relative z-10" style={{ color: primary }}>
                      {demo.title}
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-2">{demo.title}</h3>
                    <div className="flex flex-wrap gap-1">
                      {keywords.slice(0, 2).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {filteredStyles.length === 0 && filteredDemos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">暂无风格数据</p>
            <Link
              href="/analyze"
              className="inline-block bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              开始分析
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
