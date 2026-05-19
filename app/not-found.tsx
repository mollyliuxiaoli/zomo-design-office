import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-8xl font-bold text-black mb-4">404</div>
        <h1 className="text-2xl font-bold text-black mb-2">页面不存在</h1>
        <p className="text-gray-600 mb-8">你想找的设计风格不在这里</p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800">
            返回首页
          </Link>
          <Link href="/analyze" className="border border-black text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-50">
            分析截图
          </Link>
        </div>
      </div>
    </div>
  );
}
