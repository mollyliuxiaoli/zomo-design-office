import { NextRequest, NextResponse } from 'next/server';
import { assembleSpec, parseJSON } from '@/app/lib/ai-client';
import { scrapeUrl } from '@/app/lib/scraper';
import type { StyleSpecV1 } from '@/app/lib/spec/types';
import type { LibraryRecord } from '@/app/lib/storage/db';

export const runtime = 'edge';

/**
 * API Route: Reverse Engineer Page (URL mode only)
 * Image/screenshot analysis is done client-side (direct to APImart) to avoid Vercel timeout.
 * URL mode uses server-side scraper which is fast (<5s).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required (image mode uses client-side AI)' }, { status: 400 });
    }

    if (typeof url !== 'string') {
      return NextResponse.json({ error: 'URL must be a string' }, { status: 400 });
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

    const scrapedData = await scrapeUrl(url);
    const scrapedColors = scrapedData.colors.length > 0 ? scrapedData.colors : ['#2563eb', '#7c3aed'];
    const sections = scrapedData.sections.map((section, index) => ({
      position: getPositionType(index, scrapedData.sections.length),
      description: `${section.tag}: ${section.content[0] || section.type}`,
      content: section.content,
    }));

    const spec = assembleSpec({
      styleName: scrapedData.title || 'Scraped Web Page',
      source: {
        type: 'url',
        createdAt: new Date().toISOString(),
        model: 'scraper',
        originalUrl: url,
      },
      colors: {
        primary: scrapedColors.slice(0, 3),
        secondary: scrapedColors.slice(3, 5),
        background: ['#ffffff', '#f8fafc'],
        foreground: ['#0f172a', '#64748b'],
        accent: scrapedColors.slice(0, 1),
        border: ['#e2e8f0'],
      },
      typography: {
        fontStyle: 'sans',
        suggestedFonts: scrapedData.fonts.length > 0 ? scrapedData.fonts : ['Inter', 'Arial'],
        scale: 'balanced',
        headingWeight: '700',
        bodyWeight: '400',
        letterSpacing: 'normal',
        lineHeight: 'normal',
      },
      spacing: { density: 'comfortable', baseUnit: '8px' },
      radius: { style: 'subtle', values: ['4px', '8px', '16px'] },
      shadow: { style: 'soft' },
      layout: {
        composition: sections.map((s) => s.position).join('-') || 'header-content-footer',
        container: 'wide',
        alignment: 'left',
        sectionCount: sections.length,
        sections,
      },
      components: {
        buttons: scrapedData.buttons.length > 0 ? 'Primary action buttons with scraped labels.' : 'Primary action buttons with subtle radius.',
        cards: 'Light surfaces with subtle borders and soft shadows.',
        navigation: 'Standard navigation hierarchy.',
      },
      vibe: {
        keywords: ['web', 'professional', 'scraped'],
        description: scrapedData.title ? `Style for ${scrapedData.title}.` : 'Professional scraped web page style.',
        avoid: ['unrelated decorative elements'],
      },
      content: {
        headings: scrapedData.headings,
        bodyText: scrapedData.sections.map((s) => s.content[0] || '').filter(Boolean),
        buttons: scrapedData.buttons,
      },
      meta: {
        confidence: 65,
        warnings: ['URL mode uses scraped structure and inferred visual defaults.'],
      },
    }, {
      sourceType: 'url',
      originalUrl: url,
    });

    const id = spec.styleId || Date.now().toString();
    const createdAt = new Date().toISOString();

    const record: LibraryRecord = {
      id,
      spec,
      source: { type: 'user', label: url },
      title: spec.styleName || 'Scraped Page',
      thumbnailUrl: '',
      createdAt,
      updatedAt: createdAt,
      visibility: 'private',
    };

    return NextResponse.json({ record, spec });
  } catch (error) {
    console.error('Error in reverse-page API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to reverse engineer page', details: errorMessage },
      { status: 500 }
    );
  }
}

function getPositionType(index: number, total: number): string {
  if (index === 0) return 'header';
  if (index === total - 1) return 'footer';
  if (index === 1) return 'hero';
  return 'content';
}
