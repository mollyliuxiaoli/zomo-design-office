'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import { styleRepo } from '../lib/storage/repo';
import type { LibraryRecord } from '../lib/storage/db';
import { migrateIfNeeded } from '../lib/storage/migrate';

export default function LibraryPage() {
  const router = useRouter();
  const [styles, setStyles] = useState<LibraryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    void loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      await migrateIfNeeded(); // Migrate localStorage → IndexedDB
      const savedStyles = await styleRepo.listAll();
      setStyles(savedStyles);
      setError(null);
    } catch (err) {
      console.error('[distill] Failed to load styles:', err);
      setError('加载风格库失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个风格吗？')) {
      try {
        await styleRepo.delete(id);
        await loadStyles();
      } catch (err) {
        console.error('[distill] Failed to delete style:', err);
        alert('删除失败，请重试');
      }
    }
  };

  const getAllTags = () => {
    const tags = new Set<string>();
    styles.forEach(style => {
      style.spec.vibe.keywords.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  };

  const filteredStyles = styles.filter(style => {
    const matchesSearch = searchTerm === '' ||
      style.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.spec.vibe.keywords.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = filterTag === 'all' || style.spec.vibe.keywords.includes(filterTag);

    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">风格库</h1>
            <p className="text-lg text-gray-600">
              管理你已保存的所有设计风格
            </p>
          </div>
          <Link
            href="/analyze"
            className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            + 新建分析
          </Link>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Search, filter, view toggle */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索风格名称或关键词..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">全部标签</option>
              {getAllTags().map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-3 rounded-lg ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-3 rounded-lg ${viewMode === 'list' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-black">{styles.length}</div>
            <div className="text-sm text-gray-600">总风格数</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-black">{getAllTags().length}</div>
            <div className="text-sm text-gray-600">风格标签</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-black">
              {new Set(styles.map(s => s.source.type)).size}
            </div>
            <div className="text-sm text-gray-600">来源类型</div>
          </div>
        </div>

        {/* Grid view */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStyles.map(style => (
              <div
                key={style.id}
                className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/style/${style.id}`}>
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    <img
                      src={style.thumbnailUrl}
                      alt={style.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/style/${style.id}`}>
                    <h3 className="font-semibold text-lg mb-2 hover:underline">{style.title}</h3>
                  </Link>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {style.spec.vibe.keywords.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    <span className="px-2 py-1 bg-gray-200 text-gray-500 text-xs rounded">
                      {style.source.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {new Date(style.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <button
                      onClick={() => handleDelete(style.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {filteredStyles.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredStyles.map(style => (
                  <div key={style.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={style.thumbnailUrl}
                          alt={style.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/style/${style.id}`} className="font-semibold text-black hover:underline">
                          {style.title}
                        </Link>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {style.spec.vibe.keywords.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(style.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                        <button
                          onClick={() => handleDelete(style.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-500 mb-4">
                  {styles.length === 0 ? '暂无风格数据' : '没有匹配的风格'}
                </p>
              </div>
            )}
          </div>
        )}

        {filteredStyles.length === 0 && styles.length === 0 && (
          <div className="text-center py-8">
            <Link
              href="/analyze"
              className="inline-block bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800"
            >
              开始第一个分析
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
