import { NextRequest, NextResponse } from 'next/server';
import AIClient from '@/app/lib/ai-client';
import { REBUILD_PROMPT_TEMPLATE } from '@/app/lib/templates';

export const runtime = 'edge';

/**
 * API Route: Reverse Engineer Page
 * Accepts either:
 * 1. A screenshot image (base64)
 * 2. A URL to scrape (then analyze)
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

    const aiClient = new AIClient();

    let analysisResult;
    let sourceInfo = '';

    // Case 1: Analyze screenshot
    if (image) {
      if (typeof image !== 'string' || !image.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image format. Must be base64 data URL' },
          { status: 400 }
        );
      }

      sourceInfo = 'screenshot';
      analysisResult = await analyzeScreenshot(aiClient, image);
    }
    // Case 2: Scrape URL then analyze
    else {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }

      sourceInfo = url;
      analysisResult = await analyzeUrl(url);
    }

    return NextResponse.json({
      source: sourceInfo,
      ...analysisResult,
    });
  } catch (error) {
    console.error('Error in reverse-page API route:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to reverse engineer page',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze screenshot using AI vision
 */
async function analyzeScreenshot(aiClient: AIClient, image: string) {
  // Use vision analysis to extract page structure
  const analysis = await aiClient.analyzeImage(image);

  // Transform into page structure format
  const pageStructure = {
    sections: analysis.layout.structure.map((sectionDesc: string, idx: number) => ({
      id: `section-${idx + 1}`,
      type: 'container' as const,
      position: getPositionType(idx, analysis.layout.structure.length) as 'header' | 'hero' | 'content' | 'feature' | 'cta' | 'footer',
      content: idx === 0 ? analysis.content.headings : analysis.content.bodyText,
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
        text: analysis.colorPalette.primary, // Use primary for text
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
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '1rem',
      },
      shadows: [
        '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      ],
    },
    interactions: [
      {
        element: 'buttons',
        type: 'hover' as const,
        description: 'Background color change and slight elevation',
      },
      {
        element: 'links',
        type: 'hover' as const,
        description: 'Color change to secondary palette',
      },
    ],
  };

  // Generate rebuild prompt
  const rebuildPrompt = REBUILD_PROMPT_TEMPLATE(pageStructure, 'Screenshot provided');

  // Generate CSS
  const cssContent = generateCSSFromStructure(pageStructure);

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
 * Analyze URL by scraping and then using AI
 */
async function analyzeUrl(url: string) {
  // First scrape the URL
  const scrapeResponse = await fetch(new URL('/api/scrape', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!scrapeResponse.ok) {
    const error = await scrapeResponse.json();
    throw new Error(error.error || 'Failed to scrape URL');
  }

  const scrapedData = await scrapeResponse.json();

  // Use AI to analyze the scraped data and create structure
  const aiClient = new AIClient();

  // Send scraped data to Claude for structured analysis
  const structureAnalysis = await aiClient.generateDesignCode({
    colorPalette: {
      primary: scrapedData.colors.slice(0, 3) || ['#0ea5e9', '#0284c7', '#0369a1'],
      secondary: scrapedData.colors.slice(3, 5) || ['#a855f7', '#9333ea'],
      background: ['#ffffff', '#f8fafc'],
      accent: scrapedData.colors.slice(0, 1) || ['#0ea5e9'],
    },
    typography: {
      headings: `${scrapedData.fonts[0] || 'Inter'}, 700, 48px`,
      body: `${scrapedData.fonts[0] || 'Inter'}, 400, 16px`,
      characteristics: scrapedData.headings.slice(0, 3),
    },
    layout: {
      structure: scrapedData.sections.map((s: any) => `${s.tag}: ${s.content[0] || 'Content'}`),
      gridType: '12-column grid',
      spacing: 'Standard spacing',
      alignment: 'Left-aligned',
    },
    visualStyle: {
      tags: ['web', 'modern'],
      mood: scrapedData.description || 'Professional',
      aesthetic: 'Standard web design',
    },
    content: {
      headings: scrapedData.headings,
      bodyText: scrapedData.sections.map((s: any) => s.content[0] || ''),
      buttons: scrapedData.buttons,
    },
  });

  // Create page structure from scraped data
  const pageStructure = {
    sections: scrapedData.sections.map((section: any, idx: number) => ({
      id: `section-${idx + 1}`,
      type: section.type as string,
      position: getPositionType(idx, scrapedData.sections.length) as 'header' | 'hero' | 'content' | 'feature' | 'cta' | 'footer',
      content: section.content,
      layout: {
        width: '100%',
        alignment: 'left',
      },
      styling: {
        padding: '2rem',
      },
    })),
    globalStyles: {
      colors: {
        primary: scrapedData.colors.slice(0, 5) || ['#0ea5e9', '#0284c7'],
        secondary: scrapedData.colors.slice(5, 7) || ['#a855f7'],
        background: ['#ffffff', '#f8fafc'],
        text: ['#0f172a', '#64748b'],
      },
      typography: {
        headingFont: scrapedData.fonts[0] || 'Inter',
        bodyFont: scrapedData.fonts[0] || 'Inter',
        headingWeights: [700, 600],
        bodyWeights: [400],
      },
      spacing: {
        section: '4rem',
        container: '1.5rem',
        element: '1rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '1rem',
      },
      shadows: [
        '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      ],
    },
    interactions: [
      {
        element: 'buttons',
        type: 'hover' as const,
        description: 'Background color change',
      },
    ],
  };

  const rebuildPrompt = REBUILD_PROMPT_TEMPLATE(pageStructure);
  const cssContent = structureAnalysis.cssContent;

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
      mood: 'Professional web design',
    },
  };
}

/**
 * Helper: Get position type based on index
 */
function getPositionType(index: number, total: number): 'header' | 'hero' | 'content' | 'feature' | 'cta' | 'footer' {
  if (index === 0) return 'header';
  if (index === total - 1) return 'footer';
  if (index === 1) return 'hero';
  return 'content';
}

/**
 * Helper: Extract font name from font description
 */
function extractFontName(fontDesc: string): string {
  // Extract font name from description like "Bold Inter, 48px"
  const match = fontDesc.match(/([A-Z][a-zA-Z]+)/);
  return match ? match[1] : 'Inter';
}

/**
 * Helper: Generate CSS from structure
 */
function generateCSSFromStructure(structure: any): string {
  const colors = structure.globalStyles.colors;
  const typography = structure.globalStyles.typography;
  const spacing = structure.globalStyles.spacing;

  return `:root {
  /* Colors */
  --color-primary: ${colors.primary[0] || '#0ea5e9'};
  --color-primary-hover: ${colors.primary[1] || '#0284c7'};
  --color-secondary: ${colors.secondary[0] || '#a855f7'};
  --color-background: ${colors.background[0] || '#ffffff'};
  --color-background-alt: ${colors.background[1] || '#f8fafc'};
  --color-text: ${colors.text[0] || '#0f172a'};
  --color-text-muted: ${colors.text[1] || '#64748b'};

  /* Typography */
  --font-heading: '${typography.headingFont || 'Inter'}';
  --font-body: '${typography.bodyFont || 'Inter'}';

  /* Spacing */
  --spacing-section: ${spacing.section || '4rem'};
  --spacing-container: ${spacing.container || '1.5rem'};
  --spacing-element: ${spacing.element || '1rem'};

  /* Border Radius */
  --radius-sm: ${structure.globalStyles.borderRadius.sm};
  --radius-md: ${structure.globalStyles.borderRadius.md};
  --radius-lg: ${structure.globalStyles.borderRadius.lg};

  /* Shadows */
  --shadow-sm: ${structure.globalStyles.shadows[0]};
  --shadow-md: ${structure.globalStyles.shadows[1] || '0 4px 6px -1px rgb(0 0 0 / 0.1)'};
  --shadow-lg: ${structure.globalStyles.shadows[2] || '0 10px 15px -3px rgb(0 0 0 / 0.1)'};
}`;
}