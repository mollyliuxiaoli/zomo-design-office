import { NextRequest, NextResponse } from 'next/server';
import { AIClient, assembleSpec } from '@/app/lib/ai-client';
import { getAIUserErrorMessage } from '@/app/lib/ai-errors';
import type { AnalyzeMode } from '@/app/lib/analyze/modes';

export const runtime = 'edge';
export const maxDuration = 60;

const MAX_DATA_URL_LENGTH = 14 * 1024 * 1024; // roughly 10MB binary after base64 overhead

function isImagePayload(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.length > MAX_DATA_URL_LENGTH) return false;
  if (value.startsWith('data:image/')) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeMode(value: unknown): Exclude<AnalyzeMode, 'url'> {
  return value === 'screenshot' ? 'screenshot' : 'image';
}

/**
 * Server-side fallback for image/screenshot analysis.
 * The page still tries browser-direct APIMart first for speed, then uses this route
 * when the provider returns transient browser-side/internal errors.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageBase64 = body?.imageBase64;
    const styleName = typeof body?.styleName === 'string' ? body.styleName : undefined;
    const mode = normalizeMode(body?.mode);

    if (!isImagePayload(imageBase64)) {
      return NextResponse.json({ error: 'Invalid or oversized image payload' }, { status: 400 });
    }

    const client = new AIClient();
    const partialSpec = await client.analyzeImage(imageBase64, mode);
    const spec = assembleSpec(partialSpec, {
      styleName,
      sourceType: mode,
      thumbnailRef: imageBase64.startsWith('data:') ? imageBase64 : undefined,
      originalUrl: imageBase64.startsWith('data:') ? undefined : imageBase64,
      rawAiResponse: partialSpec.meta?.rawAiResponse,
    });

    return NextResponse.json({ spec, partialSpec });
  } catch (error) {
    console.error('Error in analyze-style API route:', error);
    const details = getAIUserErrorMessage(error, 'zh');
    return NextResponse.json(
      { error: 'Image analysis failed', details },
      { status: 500 }
    );
  }
}
