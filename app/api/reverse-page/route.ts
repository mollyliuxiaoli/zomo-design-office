import { NextRequest, NextResponse } from 'next/server';
import AIClient from '@/app/lib/ai-client';
import { scrapeUrl } from '@/app/lib/scraper';
import { REBUILD_PROMPT_TEMPLATE } from '@/app/lib/templates';

export const runtime = 'edge';

/**
 * API Route: Reverse Engineer Page
 * Accepts either:
 * 1. A screenshot image (base64) → Gemini vision analysis
 * 2. A URL → scrape + AI analysis
 * Returns structured "Page Rebuild Prompt" for LLM reconstruction
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

    let result;

    if (image) {
      // Validate base64 image
      if (typeof image !== 'string' || !image.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image format. Must be base64 data URL' },
          { status: 400 }
        );
      }
      result = await analyzeScreenshot(image);
    } else {
      // Validate URL
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
      result = await analyzeUrl(url);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in reverse-page API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to reverse engineer page', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Analyze screenshot using Gemini vision → Claude code gen
 */
async function analyzeScreenshot(image: string) {
  const aiClient = new AIClient();

  // Step 1: Gemini vision analysis
  const analysis = await aiClient.analyzeImage(image);

  // Step 2: Build page structure from analysis
  const pageStructure = {
    sections: analysis.layout.structure.map((sectionDesc: string, idx: number) => ({
      id: `section-${idx + 1}`,
      type: 'container',
      position: getPositionType(idx, analysis.layout.structure.length) as 'header' | 'hero' | 'content' | 'feature' | 'cta' | 'footer',
      content: idx === 0
        ? analysis.content.headings
        : analysis.content.bodyText.length > 0
          ? analysis.content.bodyText
          : [sectionDesc],
      layout: {
        width: '100%',
        alignment: analysis.layout.alignment,
      },
      styling: {
        backgroundColor: analysis.colorPalette.background[idx % analysis.colorPalette.background.length],
        padding: analysis.layout.spacing,
      },
    })),
    globalStyles: {
      colors: {
        primary: analysis.colorPalette.primary,
        secondary: analysis.colorPalette.secondary,
        background: analysis.colorPalette.background,
        text: analysis.colorPalette.primary,
      },
      typography: {
        headingFont: extractFontName(analysis.typography.headings),
        bodyFont: extractFontName(analysis.typography.body),
        headingWeights: [700, 600, 500],
        bodyWeights: [400, 500],
      },
      spacing: {
        section: '4rem',
        container: '1.5rem',
        element: '1rem',
      },
      borderRadius: { sm: '0.25rem', md: '0.5rem', lg: '1rem' },
      shadows: [
        '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      ],
    },
    interactions: [
      { element: 'buttons', type: 'hover' as const, description: 'Background color change and slight elevation' },
      { element: 'links', type: 'hover' as const, description: 'Color change to secondary palette' },
    ],
  };

  // Step 3: Claude generates CSS + rebuild prompt
  const generated = await aiClient.generateDesignCode(analysis);

  const rebuildPrompt = REBUILD_PROMPT_TEMPLATE(pageStructure, 'Screenshot provided');
  const cssContent = generated.cssContent || generateFallbackCSS(pageStructure);

  return {
    structure: pageStructure,
    rebuildPrompt,
    cssContent,
    summary: {
      totalSections: pageStructure.sections.length,
      primaryColors: analysis.colorPalette.primary,
      styleTags: analysis.visualStyle.tags,
      mood: analysis.visualStyle.mood,
    },
  };
}

/**
 * Analyze URL: scrape → AI analysis
 */
async function analyzeUrl(url: string) {
  // Step 1: Scrape the URL directly (no internal fetch)
  const scrapedData = await scrapeUrl(url);

  // Step 2: Build structure from scraped data
  const pageStructure = {
    sections: scrapedData.sections.map((section, idx) => ({
      id: `section-${idx + 1}`,
      type: section.type,
      position: getPositionType(idx, scrapedData.sections.length) as 'header' | 'hero' | 'content' | 'feature' | 'cta' | 'footer',
      content: section.content,
      layout: { width: '100%', alignment: 'left' },
      styling: { padding: '2rem' },
    })),
    globalStyles: {
      colors: {
        primary: scrapedData.colors.slice(0, 3).length > 0 ? scrapedData.colors.slice(0, 3) : ['#0ea5e9', '#0284c7'],
        secondary: scrapedData.colors.slice(3, 5).length > 0 ? scrapedData.colors.slice(3, 5) : ['#a855f7'],
        background: ['#ffffff', '#f8fafc'],
        text: ['#0f172a', '#64748b'],
      },
      typography: {
        headingFont: scrapedData.fonts[0] || 'Inter',
        bodyFont: scrapedData.fonts[0] || 'Inter',
        headingWeights: [700, 600],
        bodyWeights: [400],
      },
      spacing: { section: '4rem', container: '1.5rem', element: '1rem' },
      borderRadius: { sm: '0.25rem', md: '0.5rem', lg: '1rem' },
      shadows: [
        '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      ],
    },
    interactions: [
      { element: 'buttons', type: 'hover' as const, description: 'Background color change' },
    ],
  };

  // Step 3: Use AI to enrich the analysis
  const aiClient = new AIClient();
  let cssContent = generateFallbackCSS(pageStructure);
  let rebuildPrompt = REBUILD_PROMPT_TEMPLATE(pageStructure, scrapedData.title || url);

  try {
    const generated = await aiClient.generateDesignCode({
      colorPalette: {
        primary: pageStructure.globalStyles.colors.primary,
        secondary: pageStructure.globalStyles.colors.secondary,
        background: pageStructure.globalStyles.colors.background,
        accent: pageStructure.globalStyles.colors.primary.slice(0, 1),
      },
      typography: {
        headings: `${pageStructure.globalStyles.typography.headingFont}, 700, 48px`,
        body: `${pageStructure.globalStyles.typography.bodyFont}, 400, 16px`,
        characteristics: scrapedData.headings.slice(0, 3),
      },
      layout: {
        structure: scrapedData.sections.map(s => `${s.tag}: ${s.content[0] || 'Content'}`),
        gridType: '12-column grid',
        spacing: 'Standard spacing',
        alignment: 'Left-aligned',
      },
      visualStyle: {
        tags: ['web', 'modern'],
        mood: scrapedData.title || 'Professional',
        aesthetic: 'Standard web design',
      },
      content: {
        headings: scrapedData.headings,
        bodyText: scrapedData.sections.map(s => s.content[0] || ''),
        buttons: scrapedData.buttons,
      },
    });
    cssContent = generated.cssContent || cssContent;
  } catch (e) {
    console.error('AI enrichment failed, using fallback:', e);
  }

  return {
    structure: pageStructure,
    rebuildPrompt,
    cssContent,
    scrapedData: {
      title: scrapedData.title,
      headings: scrapedData.headings,
      sections: scrapedData.sections.length,
    },
    summary: {
      totalSections: pageStructure.sections.length,
      primaryColors: pageStructure.globalStyles.colors.primary,
      styleTags: ['web', 'professional'],
      mood: scrapedData.title || 'Professional web design',
    },
  };
}

/**
 * Helper: position type from index
 */
function getPositionType(index: number, total: number): string {
  if (index === 0) return 'header';
  if (index === total - 1) return 'footer';
  if (index === 1) return 'hero';
  return 'content';
}

/**
 * Helper: extract font name
 */
function extractFontName(fontDesc: string): string {
  const match = fontDesc.match(/([A-Z][a-zA-Z\s]+)/);
  return match ? match[1].trim() : 'Inter';
}

/**
 * Fallback CSS generator
 */
function generateFallbackCSS(structure: any): string {
  const c = structure.globalStyles.colors;
  const t = structure.globalStyles.typography;
  return `:root {
  /* Colors */
  --color-primary: ${c.primary[0] || '#0ea5e9'};
  --color-primary-hover: ${c.primary[1] || '#0284c7'};
  --color-secondary: ${c.secondary[0] || '#a855f7'};
  --color-background: ${c.background[0] || '#ffffff'};
  --color-background-alt: ${c.background[1] || '#f8fafc'};
  --color-text: ${c.text[0] || '#0f172a'};
  --color-text-muted: ${c.text[1] || '#64748b'};

  /* Typography */
  --font-heading: '${t.headingFont || 'Inter'}', sans-serif;
  --font-body: '${t.bodyFont || 'Inter'}', sans-serif;

  /* Spacing */
  --spacing-section: 4rem;
  --spacing-container: 1.5rem;
  --spacing-element: 1rem;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}`;
}
