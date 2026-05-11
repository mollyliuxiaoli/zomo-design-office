'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import { storageUtils } from '../lib/storage';
import { Style } from '@/types/style';

export default function ManagePage() {
  const router = useRouter();
  const [styles, setStyles] = useState<Style[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = () => {
    const savedStyles = storageUtils.getStyles();
    setStyles(savedStyles.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个风格吗？')) {
      storageUtils.deleteStyle(id);
      loadStyles();
    }
  };

  const getAllTags = () => {
    const tags = new Set<string>();
    styles.forEach(style => {
      style.styleTags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  };

  const filteredStyles = styles.filter(style => {
    const matchesSearch = searchTerm === '' ||
      style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = filterTag === 'all' || style.styleTags.includes(filterTag);

    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">
            风格库管理
          </h1>
          <p className="text-lg text-gray-600">
            管理你已保存的所有设计风格
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索风格名称或描述..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="sm:w-64">
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
        </div>

        {/* Style List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {filteredStyles.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredStyles.map(style => (
                <div
                  key={style.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={style.imageUrl}
                            alt={style.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-black mb-1">
                            {style.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {style.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {style.styleTags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            <span className="px-2 py-1 bg-black text-white text-xs rounded">
                              {style.projectType}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 ml-24">
                        创建于 {new Date(style.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/style/${style.id}`)}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        查看详情
                      </button>
                      <button
                        onClick={() => handleDelete(style.id)}
                        className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
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
              <p className="text-gray-500 text-lg mb-4">
                {styles.length === 0
                  ? '暂无风格数据'
                  : '没有找到匹配的风格'}
              </p>
              {styles.length === 0 && (
                <button
                  onClick={() => router.push('/extract')}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  提取新风格
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-3xl font-bold text-black mb-1">
              {styles.length}
            </div>
            <div className="text-sm text-gray-600">总风格数</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-3xl font-bold text-black mb-1">
              {getAllTags().length}
            </div>
            <div className="text-sm text-gray-600">风格标签</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-3xl font-bold text-black mb-1">
              {new Set(styles.map(s => s.projectType)).size}
            </div>
            <div className="text-sm text-gray-600">项目类型</div>
          </div>
        </div>
      </div>
    </div>
  );
}
