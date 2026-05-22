'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { styleRepo } from '../../lib/storage/repo';
import type { LibraryRecord } from '../../lib/storage/db';
import SpecEditor from '../../components/spec/SpecEditor';
import type { StyleSpecV1 } from '@/app/lib/spec/types';

type ExportTab = 'markdown' | 'css' | 'prompt' | 'tailwind' | 'shadcn';

type TokenRow = {
  name: string;
  value: string;
  usage: string;
  swatch?: string;
};

const TABS: Array<{ id: ExportTab; label: string; hint: string }> = [
  { id: 'markdown', label: 'Report', hint: '完整设计说明' },
  { id: 'css', label: 'CSS', hint: '变量输出' },
  { id: 'prompt', label: 'Prompt', hint: '复刻提示词' },
  { id: 'tailwind', label: 'Tailwind', hint: '配置 + 示例' },
  { id: 'shadcn', label: 'shadcn/ui', hint: '主题片段' },
];

const SOURCE_LABEL: Record<string, string> = {
  image: '图片分析',
  screenshot: '截图还原',
  url: '网页分析',
  user: '用户导入',
  demo: '示例风格',
};

function toList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function colorTokenRows(spec: StyleSpecV1): TokenRow[] {
  const semantic = spec.colors?.semantic || {};
  return [
    { name: 'background/base', value: spec.colors?.background?.[0] || '#ffffff', usage: '页面或 app shell 底色', swatch: spec.colors?.background?.[0] },
    { name: 'surface/elevated', value: spec.colors?.background?.[1] || spec.colors?.secondary?.[0] || '#f8fafc', usage: '卡片、面板、浮层背景', swatch: spec.colors?.background?.[1] || spec.colors?.secondary?.[0] },
    { name: 'foreground/primary', value: spec.colors?.foreground?.[0] || '#0f172a', usage: '主要正文和标题', swatch: spec.colors?.foreground?.[0] },
    { name: 'foreground/muted', value: spec.colors?.foreground?.[1] || '#64748b', usage: '说明、辅助、低优先级文本', swatch: spec.colors?.foreground?.[1] },
    { name: 'brand/primary', value: spec.colors?.primary?.[0] || '#2563eb', usage: '主 CTA、焦点态、选中态', swatch: spec.colors?.primary?.[0] },
    { name: 'brand/accent', value: spec.colors?.accent?.[0] || spec.colors?.primary?.[1] || '#7c3aed', usage: '高亮信息、强调符号、辅助品牌色', swatch: spec.colors?.accent?.[0] || spec.colors?.primary?.[1] },
    { name: 'border/default', value: spec.colors?.border?.[0] || '#e2e8f0', usage: '分割线、卡片边框、输入框轮廓', swatch: spec.colors?.border?.[0] },
    { name: 'semantic/success', value: semantic.success || '#16a34a', usage: '成功状态', swatch: semantic.success || '#16a34a' },
    { name: 'semantic/warning', value: semantic.warning || '#d97706', usage: '警告状态', swatch: semantic.warning || '#d97706' },
    { name: 'semantic/danger', value: semantic.danger || '#dc2626', usage: '错误、删除、危险操作', swatch: semantic.danger || '#dc2626' },
  ];
}

function systemTokenRows(spec: StyleSpecV1): TokenRow[] {
  return [
    { name: 'font/family', value: toList(spec.typography?.suggestedFonts).join(', ') || 'Inter, system-ui', usage: '主字体栈' },
    { name: 'font/heading-weight', value: spec.typography?.headingWeight || '700', usage: '标题字重' },
    { name: 'font/body-weight', value: spec.typography?.bodyWeight || '400', usage: '正文字重' },
    { name: 'type/scale', value: spec.typography?.scale || 'balanced', usage: '字号层级密度' },
    { name: 'type/letter-spacing', value: spec.typography?.letterSpacing || 'normal', usage: '字间距特征' },
    { name: 'spacing/density', value: spec.spacing?.density || 'comfortable', usage: '页面整体信息密度' },
    { name: 'spacing/base-unit', value: spec.spacing?.baseUnit || '8px', usage: '间距基准单位' },
    { name: 'radius/style', value: spec.radius?.style || 'subtle', usage: '圆角倾向' },
    { name: 'radius/values', value: toList(spec.radius?.values).join(' / ') || '4px / 8px / 16px', usage: '组件圆角 token' },
    { name: 'shadow/style', value: spec.shadow?.style || 'soft', usage: '阴影/层级方式' },
    { name: 'layout/container', value: spec.layout?.container || 'medium', usage: '内容容器宽度' },
    { name: 'layout/alignment', value: spec.layout?.alignment || 'mixed', usage: '对齐方式' },
  ];
}

function confidenceTone(confidence: number) {
  if (confidence >= 80) return { label: '高可信', bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (confidence >= 50) return { label: '中等可信', bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
  return { label: '需要复核', bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' };
}

function sourceLabel(style: LibraryRecord, spec: StyleSpecV1): string {
  return SOURCE_LABEL[spec.source?.type || style.source?.type || ''] || String(spec.source?.type || style.source?.type || '来源未知');
}

function tokenValuePreview(content: string): string {
  const lines = content.split('\n').filter(Boolean);
  return `${lines.length} lines`;
}

export default function StyleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [style, setStyle] = useState<LibraryRecord | null>(null);
  const [activeTab, setActiveTab] = useState<ExportTab>('markdown');
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

  const handleDownload = (tab: ExportTab, content: string) => {
    const extensions: Record<ExportTab, string> = {
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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 text-zinc-950">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-sm">
          {error ? (
            <>
              <p className="text-lg font-bold text-rose-600">{error}</p>
              <button
                onClick={() => router.push('/library')}
                className="mt-5 rounded-full bg-zinc-950 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800"
              >
                返回风格库
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-zinc-200 border-b-zinc-950" />
              <p className="font-medium text-zinc-600">正在加载 Style Spec...</p>
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

  const getTabContent = (tab: ExportTab): string => {
    if (tab === 'markdown') return markdownContent;
    if (tab === 'css') return cssContent;
    if (tab === 'prompt') return promptContent;
    if (tab === 'tailwind') {
      const parts: string[] = [];
      if (spec.derived?.tailwindConfig) parts.push(spec.derived.tailwindConfig);
      if (spec.derived?.tailwindExample) {
        if (parts.length) parts.push('', '/* --- Usage Example --- */', '');
        parts.push(spec.derived.tailwindExample);
      }
      return parts.join('\n');
    }
    if (tab === 'shadcn') {
      const parts: string[] = [];
      if (spec.derived?.shadcnTheme) parts.push(spec.derived.shadcnTheme);
      if (spec.derived?.shadcnConfig) {
        if (parts.length) parts.push('', '/* --- components.json --- */', '');
        parts.push(spec.derived.shadcnConfig);
      }
      return parts.join('\n');
    }
    return '';
  };

  const confidence = Math.max(0, Math.min(100, spec.meta?.confidence ?? 0));
  const tone = confidenceTone(confidence);
  const editorSpec = draftSpec || spec;
  const keywords = toList(spec.vibe?.keywords);
  const warnings = toList(spec.meta?.warnings);
  const colorRows = colorTokenRows(spec);
  const systemRows = systemTokenRows(spec);
  const activeContent = getTabContent(activeTab);
  const sections = spec.layout?.sections || [];
  const primary = spec.colors?.primary?.[0] || '#2563eb';
  const surface = spec.colors?.background?.[1] || '#f8fafc';
  const border = spec.colors?.border?.[0] || '#e2e8f0';

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <button
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
        >
          ← 返回
        </button>

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(24,24,27,0.08)]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:p-10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                  Style Spec v{spec.specVersion || '1.0'}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${tone.bg} ${tone.text}`}>
                  {tone.label} · {confidence}%
                </span>
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">
                  {sourceLabel(style, spec)}
                </span>
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-zinc-950 sm:text-6xl">
                {String(style.title || spec.styleName || 'Untitled Style')}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg">
                {String(spec.vibe?.description || '从参考图中提取出的视觉风格、设计 token 和复刻提示词。')}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {keywords.map(tag => (
                  <span key={String(tag)} className="rounded-full border border-zinc-200 bg-[#f7f4ee] px-3 py-1.5 text-sm font-semibold text-zinc-700">
                    {String(tag)}
                  </span>
                ))}
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-4">
                {[
                  ['Confidence', `${confidence}%`],
                  ['Palette', `${colorRows.filter(row => row.swatch).length} tokens`],
                  ['Sections', `${spec.layout?.sectionCount || sections.length || 1}`],
                  ['Exports', `${TABS.length} formats`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                    <p className="mt-2 text-xl font-black text-zinc-950">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-[1.75rem] border border-zinc-200 bg-[#f7f4ee] p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Primary actions</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <button
                    onClick={handleShare}
                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-zinc-800"
                  >
                    分享链接
                  </button>
                  <a
                    href={`/api/og?title=${encodeURIComponent(style.title || 'Style')}&keywords=${encodeURIComponent((spec.vibe?.keywords || []).join(','))}&primary=${encodeURIComponent((spec.colors?.primary?.[0] || '#2563eb'))}&bg=${encodeURIComponent((spec.colors?.background?.[0] || '#ffffff'))}&fg=${encodeURIComponent((spec.colors?.foreground?.[0] || '#0f172a'))}&confidence=${spec.meta?.confidence || 85}&palette=${encodeURIComponent((spec.colors?.primary || []).concat(spec.colors?.secondary || []).slice(0,6).join(','))}&vibe=${encodeURIComponent(String(spec.vibe?.description || '').slice(0, 80))}`}
                    target="_blank"
                    className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-black text-zinc-950 hover:border-zinc-950"
                  >
                    打开 DNA Card
                  </a>
                  <button
                    onClick={handleDelete}
                    className="rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-600 hover:border-rose-500 hover:bg-rose-50"
                  >
                    删除
                  </button>
                </div>
              </div>

              {shareUrl && (
                <p className="rounded-2xl bg-white p-3 font-mono text-xs text-zinc-500">
                  已复制：{shareUrl}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Source reference</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">原始参考图</h2>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                  {sourceLabel(style, spec)}
                </span>
              </div>
              <div className="mt-5 aspect-[4/3] overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100">
                {style.thumbnailUrl ? (
                  <img
                    src={style.thumbnailUrl}
                    alt={String(style.title || 'Style source')}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-zinc-500">
                    暂无缩略图
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Visual formula</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">风格结论</h2>
              <div className="mt-5 rounded-3xl border border-zinc-200 bg-[#f7f4ee] p-5">
                <p className="text-lg font-black leading-snug text-zinc-950">
                  {String(spec.layout?.composition || '清晰结构')} · {String(spec.spacing?.density || 'comfortable')} density · {String(spec.radius?.style || 'subtle')} radius · {String(spec.shadow?.style || 'soft')} shadow
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  这份报告把参考图拆成可执行的设计 token、组件规则与复刻提示词。优先复用 token，再按组件规则还原页面，而不是只照抄表面颜色。
                </p>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Color tokens</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">色彩体系</h2>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">copy-ready</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {colorRows.map((row) => (
                  <div key={row.name} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="h-11 w-11 shrink-0 rounded-xl border border-zinc-200" style={{ backgroundColor: row.swatch || row.value }} />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-zinc-950">{row.name}</p>
                      <p className="font-mono text-xs text-zinc-500">{row.value}</p>
                      <p className="text-xs leading-5 text-zinc-500">{row.usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">System tokens</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">排版、间距、布局</h2>
              <div className="mt-5 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
                {systemRows.map((row) => (
                  <div key={row.name} className="grid gap-2 bg-zinc-50 px-4 py-3 text-sm sm:grid-cols-[1fr_1fr_1.2fr]">
                    <span className="font-mono text-xs text-zinc-500">{row.name}</span>
                    <span className="font-bold text-zinc-950">{row.value}</span>
                    <span className="text-zinc-500">{row.usage}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
            <section className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-zinc-950 shadow-sm">
              <div className="border-b border-white/10 p-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Export console</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                      {showEditor ? '编辑 Style Spec' : '生成内容'}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {showEditor ? '修改 spec 后会自动保存并重新生成输出。' : `${TABS.find(tab => tab.id === activeTab)?.hint || ''} · ${tokenValuePreview(activeContent)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEditor(!showEditor)}
                    className="rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950 hover:bg-zinc-200"
                  >
                    {showEditor ? '查看输出' : '编辑 Spec'}
                  </button>
                </div>

                {showEditor && (
                  <div className="mt-3 text-xs" role="status">
                    {saveStatus === 'saving' && <span className="text-zinc-300">⏳ 保存中...</span>}
                    {saveStatus === 'saved' && <span className="text-emerald-300">✓ 已保存</span>}
                    {saveStatus === 'error' && <span className="text-rose-300" role="alert">⚠ 保存失败</span>}
                  </div>
                )}
              </div>

              {showEditor ? (
                <div className="bg-white p-5">
                  <SpecEditor spec={editorSpec} onChange={handleSpecChange} />
                </div>
              ) : (
                <>
                  <div className="flex gap-2 overflow-x-auto border-b border-white/10 p-3" role="tablist" aria-label="导出格式">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition-colors ${
                          activeTab === tab.id
                            ? 'bg-white text-zinc-950'
                            : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <pre className="max-h-[620px] min-h-[360px] overflow-auto bg-black/40 p-5 text-sm leading-6 text-zinc-200">
                    <code>{activeContent || '当前格式暂无内容。请编辑 Style Spec 或重新生成分析。'}</code>
                  </pre>

                  <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-[1fr_auto]">
                    <button
                      onClick={() => handleCopy(activeContent)}
                      className={`rounded-full px-5 py-3 text-sm font-black transition-colors ${
                        copied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-zinc-950 hover:bg-zinc-200'
                      }`}
                    >
                      {copied ? '已复制！' : `复制 ${TABS.find(tab => tab.id === activeTab)?.label || ''}`}
                    </button>
                    <button
                      onClick={() => handleDownload(activeTab, activeContent)}
                      className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10"
                    >
                      下载
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Component rules</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">组件复刻规则</h2>
              <div className="mt-5 grid gap-3">
                {[
                  ['Buttons', spec.components?.buttons || '使用主色表达主要操作，次级按钮保持低对比边框或 surface。'],
                  ['Cards', spec.components?.cards || `使用 ${surface} 作为卡片背景，${border} 作为边框，阴影保持 ${spec.shadow?.style || 'soft'}。`],
                  ['Navigation', spec.components?.navigation || '导航需保持清晰当前位置、稳定间距和足够触控区域。'],
                ].map(([name, desc]) => (
                  <div key={name} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: primary }} />
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">{name}</p>
                    </div>
                    <p className="text-sm leading-6 text-zinc-700">{String(desc)}</p>
                  </div>
                ))}
              </div>
            </section>

            {warnings.length > 0 && (
              <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Warnings</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">需要人工复核</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6">
                  {warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                </ul>
              </section>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
