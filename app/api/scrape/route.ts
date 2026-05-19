import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/app/lib/scraper';

export const runtime = 'edge';

/**
 * API Route: Scrape Webpage
 * Accepts a URL and returns structured data extracted from the webpage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required and must be a string' }, { status: 400 });
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are supported' }, { status: 400 });
    }

    const data = await scrapeUrl(validUrl.href);

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to scrape webpage', details: errorMessage },
      { status: 500 }
    );
  }
}
