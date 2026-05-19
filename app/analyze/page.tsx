'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import { styleRepo } from '../lib/storage/repo';
import type { LibraryRecord } from '../lib/storage/db';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from '../lib/ai-client';

type AnalyzeMode = 'image' | 'url' | 'screenshot';

export default function AnalyzePage() {
  const router = useRouter();
  const [mode, setMode] = useState<AnalyzeMode>('image');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState('');
  const [styleName, setStyleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
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
      let apiEndpoint: string;
      let requestBody: Record<string, unknown>;

      // For image/screenshot modes, resolve remote URLs to base64
      let imagePayload = preview; // already base64 from file upload
      if ((mode === 'image' || mode === 'screenshot') && imageUrl && !imagePayload?.startsWith('data:')) {
        // Fetch remote image and convert to base64
        setProgress('[1/3] 下载图片...');
        try {
          const imgRes = await fetch(imageUrl);
          const blob = await imgRes.blob();
          imagePayload = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {
          throw new Error('无法下载图片，请直接上传文件');
        }
      }

      if (mode === 'url') {
        apiEndpoint = '/api/reverse-page';
        requestBody = { url: targetUrl, type: 'url' };
        setProgress('[2/3] 抓取网页并分析视觉系统...');
      } else {
        apiEndpoint = mode === 'screenshot' ? '/api/reverse-page' : '/api/analyze-style';
        const image = preview;
        if (mode === 'screenshot') {
          requestBody = { image: imagePayload, type: 'image' };
        } else {
          requestBody = { image: imagePayload, name: styleName || undefined };
        }
        setProgress('[2/3] AI 分析视觉系统...');
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '分析失败' }));
        throw new Error(errorData.error || '分析失败');
      }

      setProgress('[3/3] 处理结果...');
      const analyzedStyle = await response.json();

      // Extract and normalize the spec
      const rawSpec = (analyzedStyle.spec || analyzedStyle) as StyleSpecV1Input;
      const fullSpec = withDerived(normalizeSpec(rawSpec));

      const id = typeof analyzedStyle.id === 'string'
        ? analyzedStyle.id
        : fullSpec.styleId || Date.now().toString();
      const createdAt = typeof analyzedStyle.createdAt === 'string'
        ? analyzedStyle.createdAt
        : new Date().toISOString();

      const record: LibraryRecord = {
        id,
        spec: fullSpec,
        source: {
          type: 'user',
          label: file?.name || imageUrl || targetUrl || undefined,
        },
        title: styleName || analyzedStyle.name || fullSpec.styleName || 'Unnamed Style',
        thumbnailUrl: preview || '',
        createdAt,
        updatedAt: createdAt,
        visibility: 'private',
      };

      const savedRecord = await styleRepo.save(record);
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
          <h1 className="text-4xl font-bold text-black mb-4">
            分析风格
          </h1>
          <p className="text-lg text-gray-600">
            上传截图、输入图片 URL 或网页 URL，Distill 会自动提取设计 DNA
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'image', label: '📷 图片分析', desc: '上传设计图' },
            { key: 'screenshot', label: '🖼️ 截图还原', desc: '上传页面截图' },
            { key: 'url', label: '🔗 网页分析', desc: '输入网页 URL' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setMode(key); setError(''); setPreview(''); }}
              className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                mode === key
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-lg p-8 mb-8">
          {/* URL mode */}
          {mode === 'url' && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                网页 URL
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://linear.app"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          )}

          {/* Image / Screenshot mode */}
          {(mode === 'image' || mode === 'screenshot') && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  图片 URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={handleImageUrlChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div className="text-center text-gray-500 mb-6">或</div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  上传图片
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Style name */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              风格名称（可选）
            </label>
            <input
              type="text"
              value={styleName}
              onChange={(e) => setStyleName(e.target.value)}
              placeholder="例如：现代极简风格"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          {/* Preview */}
          {preview && (mode === 'image' || mode === 'screenshot') && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                图片预览
              </label>
              <div className="aspect-video bg-white rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Progress */}
          {loading && progress && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              {progress}
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading || (mode === 'url' ? !targetUrl : !preview)}
            className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
              loading || (mode === 'url' ? !targetUrl : !preview)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800'
            }`}
          >
            {loading ? '分析中...' : '开始分析'}
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-black mb-3">使用说明</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• <strong>图片分析</strong> — 上传设计稿或参考图，提取颜色、排版、风格标签</li>
            <li>• <strong>截图还原</strong> — 上传页面截图，生成 CSS 变量 + 还原 Prompt</li>
            <li>• <strong>网页分析</strong> — 输入 URL，自动抓取页面并分析视觉系统</li>
            <li>• 分析完成后会自动跳转到详情页，可编辑、导出、分享</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
