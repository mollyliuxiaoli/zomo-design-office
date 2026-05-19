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

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const data = await scrapeUrl(url);

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to scrape webpage', details: errorMessage },
      { status: 500 }
    );
  }
}
