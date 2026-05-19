'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h2 className="text-2xl font-bold text-black mb-4">出了点问题</h2>
        <p className="text-gray-600 mb-6">
          页面渲染时发生了错误，请尝试刷新或返回。
        </p>
        {error.message && (
          <p className="text-sm text-red-500 mb-4 font-mono bg-red-50 p-3 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800"
          >
            重试
          </button>
          <a
            href="/"
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-200"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
