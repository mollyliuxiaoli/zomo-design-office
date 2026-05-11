'use client';

import Navigation from '../components/Navigation';

export default function RecordsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-4">
            我的记录
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            查看你的操作历史和统计信息
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-black mb-4">
            功能开发中
          </h2>
          <p className="text-gray-600 mb-6">
            此功能正在开发中，即将上线。敬请期待！
          </p>
          <p className="text-sm text-gray-500">
            当前版本专注于风格提取和管理功能
          </p>
        </div>
      </div>
    </div>
  );
}
