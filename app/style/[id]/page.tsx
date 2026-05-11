'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { storageUtils } from '../../lib/storage';
import { Style } from '@/types/style';

export default function StyleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [style, setStyle] = useState<Style | null>(null);
  const [activeTab, setActiveTab] = useState<'markdown' | 'css' | 'prompt'>('markdown');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const styleData = storageUtils.getStyleById(params.id as string);
    if (styleData) {
      setStyle(styleData);
    } else {
      router.push('/');
    }
  }, [params.id, router]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (style && confirm('确定要删除这个风格吗？')) {
      storageUtils.deleteStyle(style.id);
      router.push('/manage');
    }
  };

  if (!style) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-4xl font-bold text-black mb-2">{style.name}</h1>
              <p className="text-lg text-gray-600 mb-4">{style.description}</p>
              <div className="flex flex-wrap gap-2">
                {style.styleTags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-black text-white text-sm rounded"
                  >
                    {tag}
                  </span>
                ))}
                <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded">
                  {style.projectType}
                </span>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              删除
            </button>
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
                  src={style.imageUrl}
                  alt={style.name}
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
                  {style.colors.primary.map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 aspect-square rounded-lg border border-gray-200 relative group"
                      style={{ backgroundColor: color }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white transition-opacity">
                        {color}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">辅色</h3>
                <div className="flex gap-2">
                  {style.colors.secondary.map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 aspect-square rounded-lg border border-gray-200 relative group"
                      style={{ backgroundColor: color }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white transition-opacity">
                        {color}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">背景色</h3>
                <div className="flex gap-2">
                  {style.colors.background.map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 aspect-square rounded-lg border border-gray-200 relative group"
                      style={{ backgroundColor: color }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white transition-opacity">
                        {color}
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
                  <span className="text-sm font-medium">{style.typography.headings}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">正文字体：</span>
                  <span className="text-sm font-medium">{style.typography.body}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">描述：</span>
                  <span className="text-sm font-medium">{style.typography.description}</span>
                </div>
              </div>
            </div>

            {/* Visual Style */}
            <div>
              <h2 className="text-xl font-semibold text-black mb-4">视觉风格</h2>
              <div className="flex flex-wrap gap-2">
                {style.visualStyle.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Generated Content */}
          <div>
            <h2 className="text-xl font-semibold text-black mb-4">生成内容</h2>

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
            </div>

            {/* Content Display */}
            <div className="bg-gray-50 rounded-lg p-6 mb-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-x-auto">
                {activeTab === 'markdown' && style.markdownContent}
                {activeTab === 'css' && style.cssContent}
                {activeTab === 'prompt' && style.promptContent}
              </pre>
            </div>

            {/* Copy Button */}
            <button
              onClick={() => {
                const content =
                  activeTab === 'markdown'
                    ? style.markdownContent
                    : activeTab === 'css'
                    ? style.cssContent
                    : style.promptContent;
                handleCopy(content);
              }}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {copied ? '已复制！' : `复制${activeTab === 'prompt' ? 'Prompt' : activeTab.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
