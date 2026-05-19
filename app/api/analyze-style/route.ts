import { NextRequest, NextResponse } from 'next/server';
import { assembleSpec, parseJSON, withDerived, normalizeSpec } from '@/app/lib/ai-client';
import type { StyleSpecV1 } from '@/app/lib/spec/types';
import type { LibraryRecord } from '@/app/lib/storage/db';

export const runtime = 'edge';

/**
 * API Route: Analyze Style (Streaming)
 * Uses SSE streaming to avoid Vercel function timeout.
 * The client receives the AI response incrementally.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, name: styleName } = body;

    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image. Must be base64 data URL.' },
        { status: 400 }
      );
    }

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
                text: `Analyze this design image and return ONLY valid JSON, no markdown and no explanation.

Return a StyleSpecV1-compatible partial object. Use this exact shape and enum values:
{
  "styleName": "short style name",
  "source": { "type": "image", "model": "gemini-2.5-flash" },
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
    "composition": "header-hero-features-cta-footer",
    "container": "medium",
    "alignment": "mixed",
    "sectionCount": 5,
    "sections": [
      { "position": "header", "description": "navigation description", "content": ["visible text"] }
    ]
  },
  "components": { "buttons": "button style", "cards": "card style", "navigation": "navigation style" },
  "vibe": { "keywords": ["minimal", "modern", "clean"], "description": "overall style description", "avoid": ["visual choices to avoid"] },
  "content": { "headings": ["heading text"], "bodyText": ["body text"], "buttons": ["button text"] },
  "meta": { "confidence": 85, "warnings": [] }
}

Rules:
- Hex colors must be valid #RGB or #RRGGBB values when possible.
- If a field is uncertain, provide a reasonable default and add a warning in meta.warnings.
- Do not include derived, cssVariables, markdown, or restorationPrompt.`,
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

    // Create a streaming response that forwards AI chunks
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
                  // Forward each chunk to client as SSE
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: delta })}\n\n`));
                }
              } catch {
                // Skip malformed SSE lines
              }
            }
          }

          // Parse the complete response and send the final result
          const rawSpec = parseJSON(fullContent) as Record<string, unknown>;
          const spec = assembleSpec(rawSpec, {
            styleName: (rawSpec.styleName as string) || styleName || 'Analyzed Style',
            sourceType: 'image',
            thumbnailRef: image,
            rawAiResponse: fullContent,
          });

          const id = spec.styleId || Date.now().toString();
          const createdAt = new Date().toISOString();

          const record: LibraryRecord = {
            id,
            spec,
            source: { type: 'user', label: 'image upload' },
            title: styleName || spec.styleName || 'Analyzed Style',
            thumbnailUrl: '',
            createdAt,
            updatedAt: createdAt,
            visibility: 'private',
          };

          // Send final result
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
  } catch (error) {
    console.error('Error in analyze-style API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: '分析失败', details: errorMessage },
      { status: 500 }
    );
  }
}
