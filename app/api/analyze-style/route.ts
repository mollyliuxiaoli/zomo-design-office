import { NextRequest, NextResponse } from 'next/server';
import AIClient from '@/app/lib/ai-client';

export const runtime = 'edge';

/**
 * API Route: Analyze Style
 * Accepts an image (base64) and returns AI-extracted style analysis
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

    // Validate image is base64
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Must be base64 data URL' },
        { status: 400 }
      );
    }

    // Initialize AI client
    const aiClient = new AIClient();

    // Extract style using AI
    const result = await aiClient.extractStyle(image);

    // Transform the result into the format expected by the frontend
    const styleData = {
      name: name || 'Unnamed Style',
      description: result.analysis.visualStyle.mood,
      imageUrl: image,
      createdAt: new Date().toISOString(),
      styleTags: result.analysis.visualStyle.tags,
      projectType: 'web',
      colors: {
        primary: result.analysis.colorPalette.primary,
        secondary: result.analysis.colorPalette.secondary,
        background: result.analysis.colorPalette.background,
        accent: result.analysis.colorPalette.accent,
      },
      typography: {
        headings: result.analysis.typography.headings,
        body: result.analysis.typography.body,
        characteristics: result.analysis.typography.characteristics,
      },
      visualStyle: {
        layout: result.analysis.layout.structure.join(', '),
        spacing: result.analysis.layout.spacing,
        mood: result.analysis.visualStyle.mood,
        aesthetic: result.analysis.visualStyle.aesthetic,
      },
      markdownContent: result.generated.markdownContent,
      cssContent: result.generated.cssContent,
      promptContent: result.generated.promptContent,
    };

    return NextResponse.json(styleData);
  } catch (error) {
    console.error('Error in analyze-style API route:', error);

    // Provide detailed error information
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