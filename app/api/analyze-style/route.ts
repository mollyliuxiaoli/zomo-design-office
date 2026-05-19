import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * DEPRECATED: Image analysis is now done client-side (direct to APImart)
 * to avoid Vercel function timeout for long-running AI API calls.
 *
 * This endpoint is kept for backwards compatibility.
 * Use /api/token to get the API key, then call APImart directly.
 */
export async function POST() {
  return NextResponse.json(
    { error: '请使用新版分析页面（前端直连 AI API）' },
    { status: 410 }
  );
}
