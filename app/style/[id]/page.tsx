'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { styleRepo } from '../../lib/storage/repo';
import type { LibraryRecord } from '../../lib/storage/db';
import SpecEditor from '../../components/spec/SpecEditor';
import type { StyleSpecV1 } from '@/app/lib/spec/types';

export default function StyleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [style, setStyle] = useState<LibraryRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'markdown' | 'css' | 'prompt' | 'tailwind' | 'shadcn'>('markdown');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftSpec, setDraftSpec] = useState<StyleSpecV1 | null>(null);

  useEffect(() => {
    const loadStyle = async () => {
      const rawId = params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id || typeof id !== 'string') {
        router.push('/');
        return;
      }

      try {
        const styleData = await styleRepo.findById(id);
        if (styleData) {
          setStyle(styleData);
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('[distill] Failed to load style:', err);
        setError('加载风格详情失败');
      }
    };

    void loadStyle();
  }, [params.id, router]);

  // Debounced spec save — hook must be before any early return
  const handleSpecChange = useCallback((updatedSpec: StyleSpecV1) => {
    setDraftSpec(updatedSpec);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    const currentId = style?.id;
    if (!currentId) return;
    saveTimerRef.current = setTimeout(async () => {
      try {
        const updatedRecord = await styleRepo.update(currentId, { spec: updatedSpec });
        if (updatedRecord) {
          setStyle(updatedRecord);
          setDraftSpec(null);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('[distill] Failed to save spec edit:', err);
        setSaveStatus('error');
      }
    }, 500);
  }, [style?.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[distill] Clipboard write failed:', err);
    }
  };

  const handleDownload = (tab: typeof activeTab, content: string) => {
    const extensions: Record<string, string> = {
      markdown: 'md',
      css: 'css',
      prompt: 'txt',
      tailwind: 'ts',
      shadcn: 'css',
    };
    const ext = extensions[tab] || 'txt';
    const filename = `${String(style?.title || 'style').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${tab}.${ext}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (style && confirm('确定要删除这个风格吗？')) {
      try {
        await styleRepo.delete(style.id);
        router.push('/library');
      } catch (err) {
        console.error('[distill] Failed to delete style:', err);
        alert('删除失败，请重试');
      }
    }
  };

  const handleShare = async () => {
    if (!style) return;
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: style.spec,
          title: style.title,
          thumbnailUrl: style.thumbnailUrl,
        }),
      });
      if (!res.ok) throw new Error('分享失败');
      const { token } = await res.json();
      const url = `${window.location.origin}/s/${token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      alert('分享链接已复制到剪贴板！');
    } catch (err) {
      console.error('[distill] Share failed:', err);
      alert('分享失败，请重试');
    }
  };

  if (!style) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <>
              <p className="text-red-600 text-lg mb-4">{error}</p>
              <button
                onClick={() => router.push('/library')}
                className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800"
              >
                返回风格库
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4" />
              <p className="text-gray-600">加载中...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const spec = style.spec;
  const markdownContent = spec.derived?.markdown || '';
  const cssContent = spec.derived?.cssVariables || '';
  const promptContent = spec.derived?.restorationPrompt || '';

  // Unified content getter for both preview and copy
  const getTabContent = (tab: typeof activeTab): string => {
    if (tab === 'markdown') return markdownContent;
    if (tab === 'css') return cssContent;
    if (tab === 'prompt') return promptContent;
    if (tab === 'tailwind') {
      const parts: string[] = [];
      if (spec.derived?.tailwindConfig) {
        parts.push(spec.derived.tailwindConfig);
      }
      if (spec.derived?.tailwindExample) {
        if (parts.length) parts.push('', '/* --- Usage Example --- */', '');
        parts.push(spec.derived.tailwindExample);
      }
      return parts.join('\n');
    }
    if (tab === 'shadcn') {
      const parts: string[] = [];
      if (spec.derived?.shadcnTheme) {
        parts.push(spec.derived.shadcnTheme);
      }
      if (spec.derived?.shadcnConfig) {
        if (parts.length) parts.push('', '/* --- components.json --- */', '');
        parts.push(spec.derived.shadcnConfig);
      }
      return parts.join('\n');
    }
    return '';
  };

  // Clamped confidence for display
  const confidence = Math.max(0, Math.min(100, spec.meta?.confidence ?? 0));

  // The effective spec shown in editor (draft takes priority)
  const editorSpec = draftSpec || spec;

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-black mb-4 inline-flex items-center"
          >
            ← 返回
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-black mb-2">{String(style.title || 'Untitled')}</h1>
              <p className="text-lg text-gray-600 mb-4">{String(spec.vibe?.description || '')}</p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(spec.vibe?.keywords) ? spec.vibe.keywords : []).map(tag => (
                  <span
                    key={String(tag)}
                    className="px-3 py-1 bg-black text-white text-sm rounded"
                  >
                    {String(tag)}
                  </span>
                ))}
                <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded">
                  {style.source.type}
                </span>
              </div>

              {/* Confidence visualization */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs text-gray-500">分析置信度</span>
                <div
                  className="flex-1 max-w-48 h-2 bg-gray-200 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={confidence}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`分析置信度: ${confidence}%`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      confidence >= 80
                        ? 'bg-green-500'
                        : confidence >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${
                  confidence >= 80
                    ? 'text-green-600'
                    : confidence >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {confidence >= 80 ? '高' : confidence >= 50 ? '中' : '低'} {confidence}%
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                分享链接
              </button>
              <a
                href={`/api/og?title=${encodeURIComponent(style.title || 'Style')}&keywords=${encodeURIComponent((spec.vibe?.keywords || []).join(','))}&primary=${encodeURIComponent((spec.colors?.primary?.[0] || '#2563eb'))}&bg=${encodeURIComponent((spec.colors?.background?.[0] || '#ffffff'))}&fg=${encodeURIComponent((spec.colors?.foreground?.[0] || '#0f172a'))}&confidence=${spec.meta?.confidence || 85}&palette=${encodeURIComponent((spec.colors?.primary || []).concat(spec.colors?.secondary || []).slice(0,6).join(','))}&vibe=${encodeURIComponent(String(spec.vibe?.description || '').slice(0, 80))}`}
                target="_blank"
                className="px-4 py-2 border border-black text-black rounded-lg hover:bg-gray-50 transition-colors"
              >
                DNA Card
              </a>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image and Colors */}
          <div>
            {/* Original Image */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4">原始图片</h2>
              <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={style.thumbnailUrl}
                  alt={style.title}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Color Palette */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4">色彩体系</h2>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">主色</h3>
                <div className="flex gap-2">
                  {(spec.colors?.primary || []).map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 aspect-square rounded-lg border border-gray-200 relative group"
                      style={{ backgroundColor: String(color) }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white transition-opacity">
                        {String(color)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">辅色</h3>
                <div className="flex gap-2">
                  {(spec.colors?.secondary || []).map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 aspect-square rounded-lg border border-gray-200 relative group"
                      style={{ backgroundColor: String(color) }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white transition-opacity">
                        {String(color)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">背景色</h3>
                <div className="flex gap-2">
                  {(spec.colors?.background || []).map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 aspect-square rounded-lg border border-gray-200 relative group"
                      style={{ backgroundColor: String(color) }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white transition-opacity">
                        {String(color)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4">排版特征</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">标题字体：</span>
                  <span className="text-sm font-medium">{String(spec.typography?.suggestedFonts?.[0] || 'Inter')} / {String(spec.typography?.headingWeight || '700')}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">正文字体：</span>
                  <span className="text-sm font-medium">{String(spec.typography?.suggestedFonts?.[1] || spec.typography?.suggestedFonts?.[0] || 'Inter')} / {String(spec.typography?.bodyWeight || '400')}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">描述：</span>
                  <span className="text-sm font-medium">{String(spec.typography?.fontStyle || 'sans')} / {String(spec.typography?.scale || 'balanced')} / {String(spec.typography?.lineHeight || 'normal')}</span>
                </div>
              </div>
            </div>

            {/* Visual Style */}
            <div>
              <h2 className="text-xl font-semibold text-black mb-4">视觉风格</h2>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(spec.vibe?.keywords) ? spec.vibe.keywords : []).map(tag => (
                  <span
                    key={String(tag)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                  >
                    {String(tag)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Edit / Output toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-black">
                {showEditor ? '编辑 Style Spec' : '生成内容'}
              </h2>
              <button
                onClick={() => setShowEditor(!showEditor)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  showEditor
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {showEditor ? '查看输出' : '编辑 Spec'}
              </button>
            </div>

            {/* Save status indicator */}
            {showEditor && (
              <div className="mb-2 flex items-center gap-2 text-xs" role="status">
                {saveStatus === 'saving' && <span className="text-gray-500">⏳ 保存中...</span>}
                {saveStatus === 'saved' && <span className="text-green-600">✓ 已保存</span>}
                {saveStatus === 'error' && <span className="text-red-600" role="alert">⚠ 保存失败</span>}
              </div>
            )}

            {/* SpecEditor */}
            {showEditor ? (
              <SpecEditor spec={editorSpec} onChange={handleSpecChange} />
            ) : (
              <>
                {/* Tab Buttons */}
                <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('markdown')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'markdown'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => setActiveTab('css')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'css'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                CSS
              </button>
              <button
                onClick={() => setActiveTab('prompt')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'prompt'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                AI Prompt
              </button>
              <button
                onClick={() => setActiveTab('tailwind')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'tailwind'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tailwind
              </button>
              <button
                onClick={() => setActiveTab('shadcn')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'shadcn'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                shadcn/ui
              </button>
            </div>

            {/* Content Display */}
            <div className="bg-gray-50 rounded-lg p-6 mb-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-x-auto">
                {getTabContent(activeTab)}
              </pre>
            </div>

            {/* Copy + Download Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleCopy(getTabContent(activeTab))}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {copied ? '已复制！' : '复制'}
              </button>
              <button
                onClick={() => handleDownload(activeTab, getTabContent(activeTab))}
                className="px-6 py-3 border border-black text-black rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                下载
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
