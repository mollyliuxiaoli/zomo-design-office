import { NextRequest, NextResponse } from 'next/server';
import { isValidTokenOrigin } from '@/app/lib/security/origin';

export const runtime = 'edge';

// Simple in-memory rate limit (per IP, resets on cold start)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // 20 requests
const RATE_WINDOW = 60 * 60 * 1000; // per hour

/**
 * Returns API key for client-side AI calls (Vercel Hobby workaround).
 * Rate limited: 20 requests/hour per IP.
 * Referrer must match the deployed domain.
 * ⚠️ For production, use Vercel Pro + server-side proxy instead.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.APIMART_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }
    entry.count++;
  } else {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
  }

  // Validate referer/host (prevent third-party abuse while allowing local preview ports)
  const referer = request.headers.get('referer') || '';
  const host = request.headers.get('host') || '';
  if (!isValidTokenOrigin(referer, host)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  return NextResponse.json({ key: apiKey });
}
