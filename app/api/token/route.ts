import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Returns a short-lived proxy token for the client to call APImart directly.
 * This avoids Vercel function timeout for long-running AI API calls.
 */
export async function GET() {
  const apiKey = process.env.APIMART_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }
  return NextResponse.json({ key: apiKey });
}
