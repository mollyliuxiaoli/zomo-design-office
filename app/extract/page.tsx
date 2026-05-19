'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import { styleRepo } from '../lib/storage/repo';
import type { LibraryRecord } from '../lib/storage/db';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from '../lib/ai-client';

export default function ExtractPage() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [styleName, setStyleName] = useState('');
  const [error, setError] = useState('');

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

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    if (e.target.value) {
      setPreview(e.target.value);
      setFile(null);
    }
  };

  const handleExtract = async () => {
    if (!preview) {
      setError('请先上传图片或输入图片URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 调用真实的AI分析API
      const response = await fetch('/api/analyze-style', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: preview,
          name: styleName || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分析失败');
      }

      const analyzedStyle = await response.json();

      // Extract and normalize the spec from the API response
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
          label: file?.name || imageUrl || undefined,
        },
        title: styleName || analyzedStyle.name || fullSpec.styleName || 'Unnamed Style',
        thumbnailUrl: preview,
        createdAt,
        updatedAt: createdAt,
        visibility: 'private',
      };

      const savedRecord = await styleRepo.save(record);

      // 跳转到详情页
      router.push(`/style/${savedRecord.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">
            提取设计风格
          </h1>
          <p className="text-lg text-gray-600">
            上传图片或输入图片URL，AI将自动分析并提取设计DNA
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-8 mb-8">
          {/* URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              图片URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          <div className="text-center text-gray-500 mb-6">或</div>

          {/* File Upload */}
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

          {/* Style Name Input */}
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
          {preview && (
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Extract Button */}
          <button
            onClick={handleExtract}
            disabled={loading || !preview}
            className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
              loading || !preview
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800'
            }`}
          >
            {loading ? '分析中...' : '开始提取'}
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-black mb-3">使用说明</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• 支持上传JPG、PNG、WebP等常见图片格式</li>
            <li>• 建议上传清晰度较高的图片以获得更好的分析效果</li>
            <li>• AI将自动分析色彩、排版、视觉风格等设计元素</li>
            <li>• 分析完成后会生成Markdown、CSS和AI绘画提示词</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
