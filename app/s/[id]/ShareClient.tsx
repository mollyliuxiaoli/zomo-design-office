'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '../../components/Navigation';
import type { StyleSpecV1 } from '@/app/lib/spec/types';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from '@/app/lib/ai-client';

export default function ShareClient() {
  const params = useParams();
  const [spec, setSpec] = useState<StyleSpecV1 | null>(null);
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'markdown' | 'css' | 'prompt' | 'tailwind' | 'shadcn'>('markdown');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const id = Array.isArray(params.id) ? params.id[0] : params.id;

        // Try to decompress directly from URL token
        if (id && id.length > 10) {
          try {
            const decompressed = decompressFromEncodedURIComponent(id);
            if (decompressed) {
              const parsed = JSON.parse(decompressed);
              const rawSpec = parsed.spec || parsed;
              const fullSpec = withDerived(normalizeSpec(rawSpec as StyleSpecV1Input));
              setSpec(fullSpec);
              setTitle(parsed.title || fullSpec.styleName);
              setLoading(false);
              return;
            }
          } catch {
            // Fallback to API
          }
        }

        // Fallback: fetch from API
        const res = await fetch(`/api/share?d=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setSpec(data.spec);
        setTitle(data.title || data.spec.styleName);
      } catch (err) {
        setError('无法加载分享的风格数据');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [params.id]);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[distill] Clipboard write failed:', err);
    }
  };

  const getTabContent = (tab: typeof activeTab): string => {
    if (!spec?.derived) return '';
    if (tab === 'markdown') return spec.derived.markdown || '';
    if (tab === 'css') return spec.derived.cssVariables || '';
    if (tab === 'prompt') return spec.derived.restorationPrompt || '';
    if (tab === 'tailwind') {
      const parts: string[] = [];
      if (spec.derived.tailwindConfig) parts.push(spec.derived.tailwindConfig);
      if (spec.derived.tailwindExample) {
        if (parts.length) parts.push('', '/* --- Usage Example --- */', '');
        parts.push(spec.derived.tailwindExample);
      }
      return parts.join('\n');
    }
    if (tab === 'shadcn') {
      const parts: string[] = [];
      if (spec.derived.shadcnTheme) parts.push(spec.derived.shadcnTheme);
      if (spec.derived.shadcnConfig) {
        if (parts.length) parts.push('', '/* --- components.json --- */', '');
        parts.push(spec.derived.shadcnConfig);
      }
      return parts.join('\n');
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4" />
          <p className="text-gray-600">加载分享内容...</p>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || '数据无效'}</p>
          <a href="/" className="bg-black text-white px-6 py-2 rounded-lg font-semibold">返回首页</a>
        </div>
      </div>
    );
  }

  const confidence = Math.max(0, Math.min(100, spec.meta?.confidence ?? 0));

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Share badge */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">分享页面</span>
          <span>由 Distill 生成</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-black mb-2">{String(title || 'Shared Style')}</h1>
        <p className="text-lg text-gray-600 mb-6">{String(spec.vibe?.description || '')}</p>

        {/* Tags + Confidence */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Array.isArray(spec.vibe?.keywords) ? spec.vibe.keywords : []).map((tag: unknown, i: number) => (
            <span key={i} className="px-3 py-1 bg-black text-white text-sm rounded">{String(tag)}</span>
          ))}
        </div>

        {/* Confidence */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-xs text-gray-500">分析置信度</span>
          <div className="flex-1 max-w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-xs font-semibold">{confidence}%</span>
        </div>

        {/* Color Palette */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-black mb-4">色彩体系</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['primary', 'secondary', 'background'] as const).map((key) => (
              <div key={key}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 capitalize">{key === 'primary' ? '主色' : key === 'secondary' ? '辅色' : '背景色'}</h3>
                <div className="flex gap-1">
                  {(spec.colors?.[key] || []).map((color: unknown, i: number) => (
                    <div key={i} className="flex-1 h-12 rounded border border-gray-200 relative group"
                      style={{ backgroundColor: String(color) }}>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono opacity-0 group-hover:opacity-100 bg-black/50 text-white transition-opacity">
                        {String(color)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {(['markdown', 'css', 'prompt', 'tailwind', 'shadcn'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab === 'prompt' ? 'AI Prompt' : tab === 'shadcn' ? 'shadcn/ui' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-x-auto">
            {getTabContent(activeTab)}
          </pre>
        </div>

        <button
          onClick={() => handleCopy(getTabContent(activeTab))}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            copied ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {copied ? '已复制！' : '复制内容'}
        </button>

        {/* CTA */}
        <div className="mt-12 text-center p-8 bg-gray-50 rounded-xl">
          <h3 className="text-xl font-bold text-black mb-2">用 Distill 分析你的设计</h3>
          <p className="text-gray-600 mb-4">上传截图或输入 URL，AI 提取完整视觉风格系统</p>
          <a href="/analyze" className="inline-block bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800">
            免费开始分析
          </a>
        </div>
      </div>
    </div>
  );
}
