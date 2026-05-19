import { NextRequest, NextResponse } from 'next/server';
import AIClient from '@/app/lib/ai-client';
import type { StyleSpecV1 } from '@/app/lib/spec/types';

export const runtime = 'edge';

/**
 * API Route: Analyze Style
 * Accepts an image (base64) and returns AI-extracted style analysis.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, name } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Must be base64 data URL' },
        { status: 400 }
      );
    }

    const aiClient = new AIClient();
    const spec = await aiClient.extractStyle(image, typeof name === 'string' ? name : undefined);

    return NextResponse.json(toFrontendStyle(spec, image));
  } catch (error) {
    console.error('Error in analyze-style API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to analyze style',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

function toFrontendStyle(spec: StyleSpecV1, imageUrl: string) {
  const headingFont = spec.typography.suggestedFonts[0] || 'Inter';
  const bodyFont = spec.typography.suggestedFonts[1] || headingFont;

  return {
    id: spec.styleId,
    name: spec.styleName,
    description: spec.vibe.description,
    imageUrl,
    createdAt: spec.source.createdAt,
    styleTags: spec.vibe.keywords,
    projectType: 'web',
    colors: {
      primary: spec.colors.primary,
      secondary: spec.colors.secondary,
      background: spec.colors.background,
      accent: spec.colors.accent,
    },
    typography: {
      headings: `${headingFont}, ${spec.typography.headingWeight}, ${spec.typography.scale}`,
      body: `${bodyFont}, ${spec.typography.bodyWeight}, ${spec.typography.lineHeight}`,
      description: `${spec.typography.fontStyle} typography with ${spec.typography.letterSpacing} letter spacing`,
    },
    visualStyle: spec.vibe.keywords,
    markdownContent: spec.derived?.markdown || '',
    cssContent: spec.derived?.cssVariables || '',
    promptContent: spec.derived?.restorationPrompt || '',
    spec,
  };
}

