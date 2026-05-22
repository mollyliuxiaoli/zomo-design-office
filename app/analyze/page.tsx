'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import { styleRepo } from '../lib/storage/repo';
import type { LibraryRecord } from '../lib/storage/db';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from '../lib/ai-client';

type AnalyzeMode = 'image' | 'url' | 'screenshot';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MODE_DETAILS: Record<AnalyzeMode, {
  label: string;
  title: string;
  description: string;
  helper: string;
  cta: string;
}> = {
  image: {
    label: '图片分析',
    title: '从单张图片提取视觉风格',
    description: '适合分析网页截图、海报、组件截图或 App 界面，输出颜色、字体、间距、圆角和风格 Prompt。',
    helper: '上传本地图片，或粘贴一张可公开访问的图片直链。',
    cta: '开始分析图片',
  },
  screenshot: {
    label: '截图还原',
    title: '把截图转成复刻说明书',
    description: '适合要“照着做一个类似页面”的场景，会更关注布局结构、组件关系和可复刻提示词。',
    helper: '建议上传完整页面或关键界面截图，宽度 ≥ 1200px 效果更好。',
    cta: '开始还原截图',
  },
  url: {
    label: '网页分析',
    title: '抓取网站并提取设计系统',
    description: '输入公开网页 URL，自动抓取页面并分析视觉系统，适合竞品、灵感站和线上产品。',
    helper: '不支持登录页、验证码、内网页面或访问受限页面。',
    cta: '开始分析网页',
  },
};

const OUTPUT_HINTS = [
  'CSS Variables',
  'Tailwind Config',
  'shadcn/ui Theme',
  'Restoration Prompt',
];

/** Compress image to fit within maxWidth while maintaining aspect ratio */
async function compressImage(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth) {
        resolve(dataUrl);
        return;
      }
      const scale = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

/** Call APImart vision API directly from browser (bypasses Vercel timeout) */
async function callVisionAPI(imageBase64: string, apiKey: string): Promise<Partial<StyleSpecV1Input>> {
  const response = await fetch('https://api.apimart.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      stream: false,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this design image and return ONLY valid JSON, no markdown and no explanation.

Return a StyleSpecV1-compatible partial object. Use this exact shape and enum values:
{
  "styleName": "short style name",
  "source": { "type": "image", "model": "gemini-2.5-flash" },
  "colors": {
    "background": ["#ffffff"],
    "foreground": ["#111827"],
    "primary": ["#2563eb"],
    "secondary": ["#7c3aed"],
    "accent": ["#f59e0b"],
    "border": ["#e5e7eb"],
    "semantic": { "success": "#16a34a", "warning": "#d97706", "danger": "#dc2626", "info": "#0284c7" }
  },
  "typography": {
    "fontStyle": "sans",
    "suggestedFonts": ["Inter", "Arial"],
    "scale": "balanced",
    "headingWeight": "700",
    "bodyWeight": "400",
    "letterSpacing": "normal",
    "lineHeight": "normal"
  },
  "spacing": { "density": "comfortable", "baseUnit": "8px" },
  "radius": { "style": "subtle", "values": ["4px", "8px", "16px"] },
  "shadow": { "style": "soft" },
  "layout": {
    "composition": "header-hero-features-cta-footer",
    "container": "medium",
    "alignment": "mixed",
    "sectionCount": 5,
    "sections": [
      { "position": "header", "description": "navigation description", "content": ["visible text"] }
    ]
  },
  "components": { "buttons": "button style", "cards": "card style", "navigation": "navigation style" },
  "vibe": { "keywords": ["minimal", "modern", "clean"], "description": "overall style description", "avoid": ["visual choices to avoid"] },
  "content": { "headings": ["heading text"], "bodyText": ["body text"], "buttons": ["button text"] },
  "meta": { "confidence": 85, "warnings": [] }
}

Rules:
- Hex colors must be valid #RGB or #RRGGBB values when possible.
- If a field is uncertain, provide a reasonable default and add a warning in meta.warnings.
- Do not include derived, cssVariables, markdown, or restorationPrompt.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 错误: ${response.status} - ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return parseJSONFromResponse(content);
}

/** Robust JSON parser for AI responses */
function parseJSONFromResponse(text: string): Record<string, unknown> {
  if (!text) throw new Error('AI 返回为空');

  try { return JSON.parse(text); } catch {}

  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]); } catch {}
  }

  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.substring(braceStart, braceEnd + 1)); } catch {}
  }

  throw new Error(`无法解析 AI 响应 (长度=${text.length})`);
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

export default function AnalyzePage() {
  const router = useRouter();
  const [mode, setMode] = useState<AnalyzeMode>('image');

  const [styleName, setStyleName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const modeDetail = MODE_DETAILS[mode];

  const canAnalyze = useMemo(() => {
    if (loading) return false;
    if (mode === 'url') return targetUrl.trim().length > 0;
    return Boolean(preview || imageUrl.trim());
  }, [imageUrl, loading, mode, preview, targetUrl]);

  const handleModeChange = (nextMode: AnalyzeMode) => {
    setMode(nextMode);
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      setFile(null);
      setPreview('');
      setImageUrl('');
      setError('请上传 PNG、JPG、GIF 或 WebP 图片');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setPreview('');
      setImageUrl('');
      setError('文件过大，请上传小于 10MB 的图片');
      return;
    }

    setError('');
    setImageUrl('');
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(selectedFile);
  };

  const clearSelectedImage = () => {
    setFile(null);
    setPreview('');
    setImageUrl('');
    setError('');
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    const trimmedValue = nextValue.trim();
    setImageUrl(nextValue);
    setError('');
    if (trimmedValue) {
      setPreview(trimmedValue);
      setFile(null);
    } else if (!file) {
      setPreview('');
    }
  };

  const handleAnalyze = async () => {
    if (mode === 'url' && !targetUrl.trim()) {
      setError('请输入网页 URL');
      return;
    }
    if ((mode === 'image' || mode === 'screenshot') && !preview && !imageUrl.trim()) {
      setError('请先上传图片或输入图片 URL');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('[1/3] 准备分析...');

    try {
      let imagePayload = preview;

      // For remote image URLs, download first
      if ((mode === 'image' || mode === 'screenshot') && imageUrl.trim() && !imagePayload?.startsWith('data:')) {
        setProgress('[1/3] 下载图片...');
        try {
          const remoteImageUrl = imageUrl.trim();
          const parsedImageUrl = new URL(remoteImageUrl);
          if (!['http:', 'https:'].includes(parsedImageUrl.protocol)) {
            throw new Error('图片 URL 仅支持 HTTP/HTTPS');
          }

          const imgRes = await fetch(remoteImageUrl);
          if (!imgRes.ok) {
            throw new Error(`图片下载失败（HTTP ${imgRes.status}）`);
          }

          const contentType = imgRes.headers.get('content-type') || '';
          if (contentType && !contentType.startsWith('image/')) {
            throw new Error('图片 URL 返回的不是图片内容');
          }

          const contentLength = Number(imgRes.headers.get('content-length') || 0);
          if (contentLength > MAX_FILE_SIZE) {
            throw new Error('图片文件过大，请使用小于 10MB 的图片');
          }

          const blob = await imgRes.blob();
          if (!blob.type.startsWith('image/')) {
            throw new Error('图片 URL 返回的不是图片内容');
          }
          if (blob.size > MAX_FILE_SIZE) {
            throw new Error('图片文件过大，请使用小于 10MB 的图片');
          }

          imagePayload = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') resolve(reader.result);
              else reject(new Error('FileReader did not return string'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (imageError) {
          const message = imageError instanceof Error ? imageError.message : '无法下载图片';
          throw new Error(`${message}，请改为直接上传文件`);
        }
      }

      // Compress image
      if (imagePayload?.startsWith('data:image/')) {
        setProgress('[1/3] 压缩图片...');
        imagePayload = await compressImage(imagePayload, 800, 0.8);
      }

      let savedRecord: LibraryRecord;

      if (mode === 'url') {
        // URL mode: use server-side scraper (fast, no timeout issue)
        setProgress('[2/3] 抓取网页并分析视觉系统...');
        const response = await fetch('/api/reverse-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl.trim() }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: '分析失败' }));
          throw new Error(errorData.error || '分析失败');
        }

        const result = await response.json();
        if (result.record) {
          savedRecord = await styleRepo.save(result.record);
        } else {
          throw new Error('服务器返回数据格式异常');
        }
      } else {
        // Image/screenshot mode: call AI directly from browser (bypasses Vercel timeout)
        setProgress('[2/3] AI 分析中，请耐心等待（约 30-60 秒）...');

        // Get API key from server
        const tokenRes = await fetch('/api/token');
        if (!tokenRes.ok) throw new Error('无法获取 API 授权');
        const { key } = await tokenRes.json();

        // Call AI directly
        if (!imagePayload) throw new Error('Image processing failed');
        const rawSpec = await callVisionAPI(imagePayload, key);

        // Ensure rawSpec is a plain object
        if (typeof rawSpec !== 'object' || rawSpec === null || Array.isArray(rawSpec)) {
          throw new Error('AI 返回了无效数据格式');
        }

        const fullSpec = withDerived(normalizeSpec(rawSpec as StyleSpecV1Input));
        const id = fullSpec.styleId || Date.now().toString();
        const createdAt = new Date().toISOString();

        const record: LibraryRecord = {
          id,
          spec: fullSpec,
          source: {
            type: 'user',
            label: file?.name || imageUrl || 'image upload',
          },
          title: styleName || fullSpec.styleName || 'Analyzed Style',
          thumbnailUrl: preview || '',
          createdAt,
          updatedAt: createdAt,
          visibility: 'private',
        };

        setProgress('[3/3] 保存结果...');
        savedRecord = await styleRepo.save(record);
      }

      router.push(`/style/${savedRecord.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请重试');
      console.error(err);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <Navigation />

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-700">analyze</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black tracking-tight text-zinc-950 [word-break:keep-all] sm:text-5xl">
            输入参考图，输出可复刻的设计 DNA
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
            选择截图、图片或网站 URL，Distill 会把视觉风格拆成 token、组件语言和可直接复制给 AI 的还原提示词。
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {OUTPUT_HINTS.map((item) => (
              <div key={item} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                  <span className="font-semibold text-zinc-900">{item}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-zinc-950">分析前你会知道</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
              <li>· 支持截图上传、图片 URL 和公开网页 URL。</li>
              <li>· 图片模式推荐小于 10MB，网页模式不支持登录/验证码页面。</li>
              <li>· 分析通常需要 30-60 秒，完成后自动保存到本地风格库。</li>
            </ul>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-950/5 sm:p-6 lg:p-8">
          <div className="mb-7">
            <div role="tablist" aria-label="分析模式" className="grid grid-cols-3 gap-2 rounded-2xl bg-zinc-100 p-1">
              {(Object.keys(MODE_DETAILS) as AnalyzeMode[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mode === key}
                  onClick={() => handleModeChange(key)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 ${
                    mode === key
                      ? 'bg-zinc-950 text-white shadow-sm'
                      : 'text-zinc-600 hover:bg-white hover:text-zinc-950'
                  }`}
                >
                  {MODE_DETAILS[key].label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <h2 className="text-xl font-bold tracking-tight text-zinc-950">{modeDetail.title}</h2>
              <p className="mt-2 leading-7 text-zinc-600">{modeDetail.description}</p>
              <p className="mt-3 text-sm font-medium text-zinc-500">{modeDetail.helper}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="style-name" className="block text-sm font-semibold text-zinc-800">
                风格名称 <span className="font-normal text-zinc-500">可选</span>
              </label>
              <input
                id="style-name"
                type="text"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                placeholder="例如：极简仪表盘 / Minimalist Dashboard"
                className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
              />
            </div>

            {(mode === 'image' || mode === 'screenshot') && (
              <>
                <div>
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <label htmlFor="image-file" className="block text-sm font-semibold text-zinc-800">
                      上传图片
                    </label>
                    <span className="text-xs font-medium text-zinc-500">PNG / JPG / GIF / WebP · 最大 10MB</span>
                  </div>

                  <input
                    id="image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />

                  <label
                    htmlFor="image-file"
                    className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center transition hover:border-zinc-950 hover:bg-white focus-within:border-zinc-950"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-zinc-200 transition group-hover:-translate-y-0.5">⌁</span>
                    <span className="mt-4 text-lg font-bold text-zinc-950">拖拽图片到这里，或点击选择文件</span>
                    <span className="mt-2 max-w-md text-sm leading-6 text-zinc-500">{mode === 'screenshot' ? '建议使用完整页面截图，便于还原布局和组件关系。' : '适合网页截图、App 界面、设计稿和视觉参考图。'}</span>
                  </label>

                  {file && (
                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-zinc-900">{file.name}</div>
                        <div className="text-zinc-500">{formatFileSize(file.size)} · 已选择本地文件</div>
                      </div>
                      <button type="button" onClick={clearSelectedImage} className="rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950">
                        移除
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative text-center">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-200" />
                  <span className="relative bg-white px-3 text-sm font-medium text-zinc-400">或粘贴图片直链</span>
                </div>

                <div>
                  <label htmlFor="image-url" className="block text-sm font-semibold text-zinc-800">
                    图片 URL
                  </label>
                  <input
                    id="image-url"
                    type="url"
                    value={imageUrl}
                    onChange={handleImageUrlChange}
                    placeholder="https://example.com/screenshot.png"
                    className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
                  />
                  <p className="mt-2 text-sm leading-6 text-zinc-500">请输入可公开访问的图片直链；填写 URL 会自动替换本地上传文件。</p>
                </div>

                {preview && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-semibold text-zinc-800">图片预览</label>
                      <button type="button" onClick={clearSelectedImage} className="text-sm font-semibold text-zinc-500 hover:text-zinc-950">清空</button>
                    </div>
                    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 p-3">
                      <img
                        src={preview}
                        alt="待分析图片预览"
                        className="mx-auto max-h-80 max-w-full rounded-2xl object-contain"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === 'url' && (
              <div>
                <label htmlFor="target-url" className="block text-sm font-semibold text-zinc-800">
                  网页 URL
                </label>
                <input
                  id="target-url"
                  type="url"
                  value={targetUrl}
                  onChange={(e) => { setTargetUrl(e.target.value); setError(''); }}
                  placeholder="https://linear.app"
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
                />
                <p className="mt-2 text-sm leading-6 text-zinc-500">我们会抓取公开页面并分析首屏视觉系统；动态加载或反爬限制可能导致失败。</p>
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {progress && (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-medium text-zinc-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-200 to-transparent animate-shimmer" />
                <span className="relative z-10">{progress}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-6 py-4 text-base font-bold text-white shadow-lg shadow-zinc-950/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none disabled:hover:translate-y-0 active:scale-[0.98]"
            >
              {loading ? '分析中...' : canAnalyze ? modeDetail.cta : (mode === 'url' ? '请先输入网页 URL' : '请先上传图片或输入 URL')}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
