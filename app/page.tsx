'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from './components/Navigation';
import { styleRepo } from './lib/storage/repo';
import type { LibraryRecord } from './lib/storage/db';

const STYLE_TAGS = ['Minimalist', 'Brutalist', 'Editorial', 'Corporate', 'Playful', 'Luxury', 'Retro', 'Futuristic', 'Organic', 'Swiss'];

export default function Home() {
  const [styles, setStyles] = useState<LibraryRecord[]>([]);
  const [selectedStyleTag, setSelectedStyleTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadStyles();
  }, []);

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
            收集、提取、复用、上传任意网站截图或图片，一键提取设计DNA，构建你的风格参考库
          </p>
          <Link
            href="/analyze"
            className="inline-block bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            开始分析
          </Link>
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

        {/* Style Grid */}
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
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredStyles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              {styles.length === 0
                ? '暂无风格数据，开始提取你的第一个设计风格吧！'
                : '没有找到匹配的风格'}
            </p>
            {styles.length === 0 && (
              <Link
                href="/analyze"
                className="inline-block bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                开始分析
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
