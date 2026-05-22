'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import { styleRepo } from '../lib/storage/repo';
import type { LibraryRecord } from '../lib/storage/db';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from '../lib/ai-client';

type AnalyzeMode = 'image' | 'url' | 'screenshot';

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

  // Parse JSON from response
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    if (e.target.value) {
      setPreview(e.target.value);
      setFile(null);
    }
  };

  const handleAnalyze = async () => {
    if (mode === 'url' && !targetUrl) {
      setError('请输入网页 URL');
      return;
    }
    if ((mode === 'image' || mode === 'screenshot') && !preview && !imageUrl) {
      setError('请先上传图片或输入图片 URL');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('[1/3] 准备分析...');

    try {
      let imagePayload = preview;

      // For remote image URLs, download first
      if ((mode === 'image' || mode === 'screenshot') && imageUrl && !imagePayload?.startsWith('data:')) {
        setProgress('[1/3] 下载图片...');
        try {
          const imgRes = await fetch(imageUrl);
          const blob = await imgRes.blob();
          imagePayload = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') resolve(reader.result);
              else reject(new Error('FileReader did not return string'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {
          throw new Error('无法下载图片，请直接上传文件');
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
          body: JSON.stringify({ url: targetUrl }),
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
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            分析风格
          </h1>
          <p className="text-zinc-500">
            上传截图或输入 URL，AI 提取视觉风格系统
          </p>
        </div>

        {/* Mode Selector - Premium pill style */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { key: 'image' as const, label: '图片分析' },
            { key: 'screenshot' as const, label: '截图还原' },
            { key: 'url' as const, label: '网页分析' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                mode === m.key
                  ? 'bg-zinc-950 text-white shadow-md'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              } active:scale-[0.98]`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Style Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            风格名称（可选）
          </label>
          <input
            type="text"
            value={styleName}
            onChange={(e) => setStyleName(e.target.value)}
            placeholder="例如：Minimalist Dashboard"
            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-all"
          />
        </div>

        {(mode === 'image' || mode === 'screenshot') && (
          <>
            {/* File Upload - Beautiful drag-and-drop zone */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                上传图片
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-8 border-2 border-dashed border-zinc-300 rounded-lg hover:border-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500 outline-none transition-all cursor-pointer bg-zinc-50 hover:bg-zinc-100"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-zinc-500">
                    <div className="text-2xl mb-2">拖拽图片到这里或点击上传</div>
                    <div className="text-sm">支持 PNG, JPG, GIF, WebP</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-zinc-400 text-sm mb-4">或</div>

            {/* Image URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                图片 URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={handleImageUrlChange}
                placeholder="https://example.com/screenshot.png"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-all"
              />
            </div>

            {/* Preview */}
            {preview && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  图片预览
                </label>
                <div className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full max-h-80 mx-auto"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'url' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              网页 URL
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://linear.app"
              className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-all"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Progress - Enhanced with shimmer effect */}
        {progress && (
          <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 text-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-200 to-transparent animate-shimmer"></div>
            <span className="relative z-10">{progress}</span>
          </div>
        )}

        {/* Submit - With active state feedback */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-3 px-6 bg-zinc-950 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {loading ? '分析中...' : '开始分析'}
        </button>

        {/* Usage Instructions */}
        <div className="mt-12 text-center text-zinc-400 text-sm">
          使用说明
        </div>
      </div>
    </div>
  );
}
