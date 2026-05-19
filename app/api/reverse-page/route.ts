import { NextRequest, NextResponse } from 'next/server';
import AIClient, { assembleSpec } from '@/app/lib/ai-client';
import { scrapeUrl } from '@/app/lib/scraper';
import type { StyleSpecV1 } from '@/app/lib/spec/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * API Route: Reverse Engineer Page
 * Accepts either:
 * 1. A screenshot image (base64) -> Gemini vision analysis -> StyleSpec renderers
 * 2. A URL -> scrape -> StyleSpec renderers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, url } = body;

    if (!image && !url) {
      return NextResponse.json(
        { error: 'Either image or URL is required' },
        { status: 400 }
      );
    }

    if (image && url) {
      return NextResponse.json(
        { error: 'Provide either image or URL, not both' },
        { status: 400 }
      );
    }

    if (image) {
      if (typeof image !== 'string' || !image.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image format. Must be base64 data URL' },
          { status: 400 }
        );
      }

      return NextResponse.json(await analyzeScreenshot(image));
    }

    if (typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    return NextResponse.json(await analyzeUrl(url));
  } catch (error) {
    console.error('Error in reverse-page API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to reverse engineer page', details: errorMessage },
      { status: 500 }
    );
  }
}

async function analyzeScreenshot(image: string) {
  const aiClient = new AIClient();
  const partialSpec = await aiClient.analyzeImage(image);
  const spec = assembleSpec(partialSpec, {
    styleName: partialSpec.styleName || 'Screenshot Style',
    sourceType: 'screenshot',
    thumbnailRef: image,
    rawAiResponse: partialSpec.meta?.rawAiResponse,
  });

  return responseFromSpec(spec);
}

async function analyzeUrl(url: string) {
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
    spacing: {
      density: 'comfortable',
      baseUnit: '8px',
    },
    radius: {
      style: 'subtle',
      values: ['4px', '8px', '16px'],
    },
    shadow: {
      style: 'soft',
    },
    layout: {
      composition: sections.map((section) => section.position).join('-') || 'header-content-footer',
      container: 'wide',
      alignment: 'left',
      sectionCount: sections.length,
      sections,
    },
    components: {
      buttons: scrapedData.buttons.length > 0 ? 'Use scraped button labels with primary color styling.' : 'Primary action buttons with subtle radius.',
      cards: 'Light surfaces with subtle borders and soft shadows.',
      navigation: 'Use the scraped page hierarchy and left-aligned content.',
    },
    vibe: {
      keywords: ['web', 'professional', 'scraped'],
      description: scrapedData.title ? `Professional web page style for ${scrapedData.title}.` : 'Professional scraped web page style.',
      avoid: ['unrelated decorative elements'],
    },
    content: {
      headings: scrapedData.headings,
      bodyText: scrapedData.sections.map((section) => section.content[0] || '').filter(Boolean),
      buttons: scrapedData.buttons,
    },
    meta: {
      confidence: 65,
      warnings: ['URL mode uses scraped structure and inferred visual defaults.'],
      rendererVersion: '1.0',
      promptVersion: 'style-spec-v1.0',
    },
  }, {
    sourceType: 'url',
    originalUrl: url,
  });

  return {
    ...responseFromSpec(spec),
    scrapedData: {
      title: scrapedData.title,
      headings: scrapedData.headings,
      sections: scrapedData.sections.length,
    },
  };
}

function responseFromSpec(spec: StyleSpecV1) {
  const structure = buildPageStructure(spec);

  return {
    structure,
    rebuildPrompt: spec.derived?.restorationPrompt || '',
    cssContent: spec.derived?.cssVariables || '',
    markdownContent: spec.derived?.markdown || '',
    spec,
    summary: {
      totalSections: structure.sections.length,
      primaryColors: spec.colors.primary,
      styleTags: spec.vibe.keywords,
      mood: spec.vibe.description,
    },
  };
}

function buildPageStructure(spec: StyleSpecV1) {
  const sections = spec.layout.sections && spec.layout.sections.length > 0
    ? spec.layout.sections
    : [{ position: 'content', description: spec.layout.composition, content: spec.content?.bodyText || [] }];

  return {
    sections: sections.map((section, index) => ({
      id: `section-${index + 1}`,
      type: 'container',
      position: normalizePosition(section.position, index, sections.length),
      content: section.content && section.content.length > 0 ? section.content : [section.description],
      layout: {
        width: '100%',
        alignment: spec.layout.alignment,
      },
      styling: {
        backgroundColor: spec.colors.background[index % spec.colors.background.length] || '#ffffff',
        padding: paddingForDensity(spec.spacing.density),
      },
    })),
    globalStyles: {
      colors: {
        primary: spec.colors.primary,
        secondary: spec.colors.secondary,
        background: spec.colors.background,
        text: spec.colors.foreground,
      },
      typography: {
        headingFont: spec.typography.suggestedFonts[0] || 'Inter',
        bodyFont: spec.typography.suggestedFonts[1] || spec.typography.suggestedFonts[0] || 'Inter',
        headingWeights: [Number(spec.typography.headingWeight) || 700],
        bodyWeights: [Number(spec.typography.bodyWeight) || 400],
      },
      spacing: {
        section: '4rem',
        container: '1.5rem',
        element: spec.spacing.baseUnit || '1rem',
      },
      borderRadius: {
        sm: spec.radius.values?.[0] || '0.25rem',
        md: spec.radius.values?.[1] || '0.5rem',
        lg: spec.radius.values?.[2] || '1rem',
      },
      shadows: [spec.shadow.style],
    },
    interactions: [
      { element: 'buttons', type: 'hover' as const, description: spec.components?.buttons || 'Use primary color hover states.' },
      { element: 'links', type: 'hover' as const, description: 'Use accent or primary color on hover.' },
    ],
  };
}

function getPositionType(index: number, total: number): string {
  if (index === 0) return 'header';
  if (index === total - 1) return 'footer';
  if (index === 1) return 'hero';
  return 'content';
}

function normalizePosition(position: string, index: number, total: number): 'header' | 'hero' | 'content' | 'feature' | 'cta' | 'footer' {
  if (position === 'header' || position === 'hero' || position === 'feature' || position === 'cta' || position === 'footer') {
    return position;
  }
  return getPositionType(index, total) as 'header' | 'hero' | 'content' | 'feature' | 'cta' | 'footer';
}

function paddingForDensity(density: StyleSpecV1['spacing']['density']): string {
  if (density === 'compact') return '1.5rem';
  if (density === 'spacious') return '5rem';
  return '3rem';
}

