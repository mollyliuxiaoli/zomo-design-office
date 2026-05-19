import { NextRequest, NextResponse } from 'next/server';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from '@/app/lib/ai-client';

export const runtime = 'edge';

/**
 * POST /api/share — Compress a StyleSpecV1 into a shareable URL token
 * GET /api/share?d=<token> — Decompress and return the spec
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spec, title, thumbnailUrl } = body;

    if (!spec) {
      return NextResponse.json({ error: 'spec is required' }, { status: 400 });
    }

    // Strip derived (can be recomputed) and thumbnail (too large) to keep URL small
    const shareableSpec = { ...spec };
    delete shareableSpec.derived;
    delete shareableSpec.source?.thumbnailRef;

    const payload = JSON.stringify({ spec: shareableSpec, title, thumbnailUrl });
    const compressed = compressToEncodedURIComponent(payload);

    // Check size limit (URLs should be <8000 chars)
    if (compressed.length > 7000) {
      // If too large, strip more data
      const minimalSpec = {
        styleName: spec.styleName,
        colors: spec.colors,
        typography: spec.typography,
        vibe: spec.vibe,
        meta: spec.meta,
      };
      const minimalPayload = JSON.stringify({ spec: minimalSpec, title });
      const minimalCompressed = compressToEncodedURIComponent(minimalPayload);
      return NextResponse.json({ token: minimalCompressed, truncated: true });
    }

    return NextResponse.json({ token: compressed });
  } catch (error) {
    console.error('Error in share API:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('d');
  if (!token) {
    return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 });
  }

  try {
    const decompressed = decompressFromEncodedURIComponent(token);
    if (!decompressed) {
      return NextResponse.json({ error: 'Invalid share data' }, { status: 400 });
    }

    const parsed = JSON.parse(decompressed);
    const rawSpec = parsed.spec || parsed;
    const fullSpec = withDerived(normalizeSpec(rawSpec as StyleSpecV1Input));

    return NextResponse.json({
      spec: fullSpec,
      title: parsed.title || fullSpec.styleName,
      thumbnailUrl: parsed.thumbnailUrl || '',
    });
  } catch (error) {
    console.error('Error decompressing share data:', error);
    return NextResponse.json({ error: 'Failed to load shared style' }, { status: 400 });
  }
}
