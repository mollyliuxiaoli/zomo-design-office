import { NextRequest, NextResponse } from 'next/server';
import { assembleSpec, parseJSON } from '@/app/lib/ai-client';
import { scrapeUrl } from '@/app/lib/scraper';
import type { StyleSpecV1 } from '@/app/lib/spec/types';
import type { LibraryRecord } from '@/app/lib/storage/db';

export const runtime = 'edge';

/**
 * API Route: Reverse Engineer Page (Streaming)
 * Uses SSE streaming to avoid Vercel function timeout.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, url } = body;

    if (!image && !url) {
      return NextResponse.json({ error: 'Either image or URL is required' }, { status: 400 });
    }

    if (image && url) {
      return NextResponse.json({ error: 'Provide either image or URL, not both' }, { status: 400 });
    }

    if (image) {
      if (typeof image !== 'string' || !image.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid image format. Must be base64 data URL' }, { status: 400 });
      }
      return handleImageAnalysis(image);
    }

    if (typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    return handleUrlAnalysis(url);
  } catch (error) {
    console.error('Error in reverse-page API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to reverse engineer page', details: errorMessage },
      { status: 500 }
    );
  }
}

async function handleImageAnalysis(image: string) {
  // Stream the AI response
  const aiResponse = await fetch('https://api.apimart.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.APIMART_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      stream: true,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this screenshot and return ONLY valid JSON, no markdown and no explanation.

Return a StyleSpecV1-compatible partial object. Use this exact shape:
{
  "styleName": "short style name",
  "source": { "type": "screenshot", "model": "gemini-2.5-flash" },
  "colors": {
    "background": ["#ffffff"],
    "foreground": ["#111827"],
    "primary": ["#2563eb"],
    "secondary": ["#7c3aed"],
    "accent": ["#f59e0b"],
    "border": ["#e5e7eb"],
    "semantic": { "success": "#16a34a", "warning": "#d97706", "danger": "#dc2626", "info": "#0284c7" }
  },
  "typography": {
    "fontStyle": "sans",
    "suggestedFonts": ["Inter", "Arial"],
    "scale": "balanced",
    "headingWeight": "700",
    "bodyWeight": "400",
    "letterSpacing": "normal",
    "lineHeight": "normal"
  },
  "spacing": { "density": "comfortable", "baseUnit": "8px" },
  "radius": { "style": "subtle", "values": ["4px", "8px", "16px"] },
  "shadow": { "style": "soft" },
  "layout": {
    "composition": "header-hero-content-footer",
    "container": "medium",
    "alignment": "mixed",
    "sectionCount": 3,
    "sections": [
      { "position": "header", "description": "section desc", "content": ["visible text"] }
    ]
  },
  "components": { "buttons": "style", "cards": "style", "navigation": "style" },
  "vibe": { "keywords": ["keyword1"], "description": "description", "avoid": [] },
  "content": { "headings": ["text"], "bodyText": ["text"], "buttons": ["text"] },
  "meta": { "confidence": 85, "warnings": [] }
}

Rules:
- Extract ALL visible text from the screenshot into content fields.
- Identify exact hex colors for backgrounds, text, buttons, badges.
- Analyze typography (font style, weights, sizes).
- Map the layout structure into sections.
- Do not include derived fields.`,
            },
            {
              type: 'image_url',
              image_url: { url: image },
            },
          ],
        },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    return NextResponse.json(
      { error: `Vision API error: ${aiResponse.status}`, details: errorText },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = aiResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullContent += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: delta })}\n\n`));
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // Parse complete response
        const rawSpec = parseJSON(fullContent) as Record<string, unknown>;
        const spec = assembleSpec(rawSpec, {
          styleName: (rawSpec.styleName as string) || 'Screenshot Style',
          sourceType: 'screenshot',
          thumbnailRef: image,
          rawAiResponse: fullContent,
        });

        const id = spec.styleId || Date.now().toString();
        const createdAt = new Date().toISOString();

        const record: LibraryRecord = {
          id,
          spec,
          source: { type: 'user', label: 'screenshot' },
          title: spec.styleName || 'Screenshot Style',
          thumbnailUrl: '',
          createdAt,
          updatedAt: createdAt,
          visibility: 'private',
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          record,
          spec,
        })}\n\n`));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function handleUrlAnalysis(url: string) {
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

  // URL mode is fast, return JSON directly
  return NextResponse.json({ record, spec });
}

function getPositionType(index: number, total: number): string {
  if (index === 0) return 'header';
  if (index === total - 1) return 'footer';
  if (index === 1) return 'hero';
  return 'content';
}
