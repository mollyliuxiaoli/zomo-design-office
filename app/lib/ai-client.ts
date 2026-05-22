/**
 * AI Client for APIMart (OpenAI-compatible API)
 * Gemini 2.5 Flash vision analysis -> StyleSpecV1 -> local renderers
 */

import { renderCssVariables } from '@/app/lib/renderers/css-variables';
import { renderMarkdown } from '@/app/lib/renderers/markdown-doc';
import { renderRestorationPrompt } from '@/app/lib/renderers/restoration-prompt';
import { renderTailwindConfig, renderTailwindExample } from '@/app/lib/renderers/tailwind';
import { renderShadcnTheme, renderShadcnConfig } from '@/app/lib/renderers/shadcn';
import type { StyleSpecV1, StyleSpecV1Input } from '@/app/lib/spec/types';
import { STYLE_ANALYSIS_PROMPT } from '@/app/lib/style-analysis-prompt';
export type { StyleSpecV1Input } from '@/app/lib/spec/types';

const API_BASE_URL = 'https://api.apimart.ai/v1';
const API_KEY = process.env.APIMART_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const PROMPT_VERSION = 'style-spec-v1.0';
const RENDERER_VERSION = '1.0';
let idCounter = 0;

type SourceType = StyleSpecV1['source']['type'];

type AssembleSpecOptions = {
  styleName?: string;
  sourceType?: SourceType;
  originalUrl?: string;
  thumbnailRef?: string;
  rawAiResponse?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const result = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return result.length > 0 ? result : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function optionalEnumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : undefined;
}

function sectionsValue(value: unknown): StyleSpecV1['layout']['sections'] {
  if (!Array.isArray(value)) return undefined;

  const sections = value.map((item, index) => {
    const section = asRecord(item);
    return {
      position: stringValue(section.position, `section-${index + 1}`),
      description: stringValue(section.description, 'Content section'),
      content: Array.isArray(section.content) ? stringArray(section.content, []) : undefined,
    };
  });

  return sections.length > 0 ? sections : undefined;
}

function legacySections(partial: Record<string, unknown>): StyleSpecV1['layout']['sections'] {
  const layout = asRecord(partial.layout);
  const structure = stringArray(layout.structure, []);
  if (structure.length === 0) return undefined;

  return structure.map((description, index) => ({
    position: index === 0 ? 'header' : index === 1 ? 'hero' : `section-${index + 1}`,
    description,
  }));
}

function legacyColors(partial: Record<string, unknown>): Record<string, unknown> {
  const colorPalette = asRecord(partial.colorPalette);
  return Object.keys(colorPalette).length > 0 ? colorPalette : asRecord(partial.colors);
}

function legacyTypography(partial: Record<string, unknown>): Record<string, unknown> {
  const typography = asRecord(partial.typography);
  const suggestedFonts = stringArray(typography.suggestedFonts, []);
  if (suggestedFonts.length > 0) return typography;

  return {
    ...typography,
    suggestedFonts: [
      extractFontName(stringValue(typography.headings, 'Inter')),
      extractFontName(stringValue(typography.body, 'Arial')),
    ],
  };
}

function extractFontName(fontDesc: string): string {
  const match = fontDesc.match(/([A-Z][a-zA-Z\s]+)/);
  return match ? match[1].trim() : 'Inter';
}

export function withDerived(spec: StyleSpecV1): StyleSpecV1 {
  const specWithoutDerived = { ...spec, derived: undefined };
  return {
    ...spec,
    derived: {
      cssVariables: renderCssVariables(specWithoutDerived),
      markdown: renderMarkdown(specWithoutDerived),
      restorationPrompt: renderRestorationPrompt(specWithoutDerived),
      tailwindConfig: renderTailwindConfig(specWithoutDerived),
      tailwindExample: renderTailwindExample(specWithoutDerived),
      shadcnTheme: renderShadcnTheme(specWithoutDerived),
      shadcnConfig: renderShadcnConfig(specWithoutDerived),
    },
  };
}

export function normalizeSpec(partialSpec: StyleSpecV1Input): StyleSpecV1 {
  const partial = asRecord(partialSpec);
  const source = asRecord(partial.source);
  const colors = legacyColors(partial);
  const typography = legacyTypography(partial);
  const spacing = asRecord(partial.spacing);
  const radius = asRecord(partial.radius);
  const shadow = asRecord(partial.shadow);
  const layout = asRecord(partial.layout);
  const components = asRecord(partial.components);
  const vibe = asRecord(partial.vibe);
  const content = asRecord(partial.content);
  const meta = asRecord(partial.meta);
  const sections = sectionsValue(layout.sections) || legacySections(partial);
  const keywords = stringArray(vibe.keywords, stringArray(asRecord(partial.visualStyle).tags, ['modern', 'clean']));

  return {
    specVersion: '1.0',
    styleId: stringValue(partial.styleId, `${Date.now()}-${++idCounter}`),
    styleName: stringValue(partial.styleName, 'Unnamed Style'),
    source: {
      type: enumValue(source.type, ['image', 'url', 'screenshot'] as const, 'image'),
      createdAt: stringValue(source.createdAt, new Date().toISOString()),
      model: stringValue(source.model, GEMINI_MODEL),
      originalUrl: typeof source.originalUrl === 'string' ? source.originalUrl : undefined,
      thumbnailRef: typeof source.thumbnailRef === 'string' ? source.thumbnailRef : undefined,
    },
    colors: {
      background: stringArray(colors.background, ['#ffffff', '#f8fafc']),
      foreground: stringArray(colors.foreground, ['#0f172a', '#64748b']),
      primary: stringArray(colors.primary, ['#2563eb']),
      secondary: stringArray(colors.secondary, ['#7c3aed']),
      accent: stringArray(colors.accent, ['#f59e0b']),
      border: stringArray(colors.border, ['#e2e8f0']),
      semantic: {
        success: stringValue(asRecord(colors.semantic).success, '#16a34a'),
        warning: stringValue(asRecord(colors.semantic).warning, '#d97706'),
        danger: stringValue(asRecord(colors.semantic).danger, '#dc2626'),
        info: stringValue(asRecord(colors.semantic).info, '#0284c7'),
      },
    },
    typography: {
      fontStyle: enumValue(typography.fontStyle, ['sans', 'serif', 'mono', 'mixed'] as const, 'sans'),
      suggestedFonts: stringArray(typography.suggestedFonts, ['Inter', 'Arial']),
      scale: enumValue(typography.scale, ['compact', 'balanced', 'display'] as const, 'balanced'),
      headingWeight: stringValue(typography.headingWeight, '700'),
      bodyWeight: stringValue(typography.bodyWeight, '400'),
      letterSpacing: enumValue(typography.letterSpacing, ['tight', 'normal', 'wide'] as const, 'normal'),
      lineHeight: enumValue(typography.lineHeight, ['compact', 'normal', 'relaxed'] as const, 'normal'),
    },
    spacing: {
      density: enumValue(spacing.density, ['compact', 'comfortable', 'spacious'] as const, 'comfortable'),
      baseUnit: stringValue(spacing.baseUnit, '8px'),
    },
    radius: {
      style: enumValue(radius.style, ['sharp', 'subtle', 'rounded', 'pill'] as const, 'subtle'),
      values: stringArray(radius.values, ['4px', '8px', '16px']),
    },
    shadow: {
      style: enumValue(shadow.style, ['none', 'soft', 'crisp', 'dramatic'] as const, 'soft'),
    },
    layout: {
      composition: stringValue(layout.composition, stringArray(layout.structure, ['header', 'hero', 'content', 'footer']).join('-')),
      container: enumValue(layout.container, ['narrow', 'medium', 'wide', 'full'] as const, 'medium'),
      alignment: enumValue(layout.alignment, ['left', 'center', 'mixed'] as const, 'mixed'),
      sectionCount: numberValue(layout.sectionCount, sections?.length || 1),
      sections,
    },
    components: {
      buttons: typeof components.buttons === 'string' ? components.buttons : undefined,
      cards: typeof components.cards === 'string' ? components.cards : undefined,
      navigation: typeof components.navigation === 'string' ? components.navigation : undefined,
    },
    vibe: {
      keywords,
      description: stringValue(vibe.description, stringValue(asRecord(partial.visualStyle).mood, 'Modern, clean digital interface.')),
      avoid: stringArray(vibe.avoid, []),
    },
    content: {
      headings: stringArray(content.headings, []),
      bodyText: stringArray(content.bodyText, []),
      buttons: stringArray(content.buttons, []),
    },
    derived: undefined,
    meta: {
      confidence: Math.max(0, Math.min(100, numberValue(meta.confidence, 75))),
      warnings: stringArray(meta.warnings, []),
      rendererVersion: stringValue(meta.rendererVersion, RENDERER_VERSION),
      promptVersion: stringValue(meta.promptVersion, PROMPT_VERSION),
      rawAiResponse: typeof meta.rawAiResponse === 'string' ? meta.rawAiResponse : undefined,
    },
  };
}

export function assembleSpec(partialSpec: StyleSpecV1Input, options: AssembleSpecOptions = {}): StyleSpecV1 {
  const existingSource = asRecord(partialSpec.source);
  const existingMeta = asRecord(partialSpec.meta);
  const source: StyleSpecV1Input['source'] = {
    ...partialSpec.source,
    type: options.sourceType ?? optionalEnumValue(existingSource.type, ['image', 'url', 'screenshot'] as const),
    originalUrl: options.originalUrl ?? (typeof existingSource.originalUrl === 'string' ? existingSource.originalUrl : undefined),
    thumbnailRef: options.thumbnailRef ?? (typeof existingSource.thumbnailRef === 'string' ? existingSource.thumbnailRef : undefined),
  };
  const meta = {
    ...existingMeta,
    rawAiResponse: options.rawAiResponse || (typeof existingMeta.rawAiResponse === 'string' ? existingMeta.rawAiResponse : undefined),
    rendererVersion: RENDERER_VERSION,
    promptVersion: PROMPT_VERSION,
  };

  return withDerived(normalizeSpec({
    ...partialSpec,
    styleId: partialSpec.styleId || `${Date.now()}-${++idCounter}`,
    styleName: options.styleName || partialSpec.styleName || 'Unnamed Style',
    source,
    meta,
  }));
}

export class AIClient {
  private headers: HeadersInit;

  constructor() {
    if (!API_KEY) {
      throw new Error('APIMART_API_KEY environment variable is not set');
    }
    this.headers = {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Analyze image using Gemini 2.5 Flash.
   */
  async analyzeImage(imageBase64: string): Promise<Partial<StyleSpecV1>> {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: GEMINI_MODEL,
        stream: false,
        max_tokens: 2048,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: STYLE_ANALYSIS_PROMPT,
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vision API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    let parsed: Partial<StyleSpecV1>;

    try {
      parsed = parseJSON(content) as Partial<StyleSpecV1>;
    } catch (parseError) {
      if (choice?.finish_reason === 'length') {
        throw new Error('AI response was truncated before valid JSON. Retry with a smaller or more focused screenshot.');
      }
      throw parseError;
    }

    return {
      ...parsed,
      meta: {
        ...asRecord(parsed.meta),
        rawAiResponse: content,
      } as StyleSpecV1['meta'],
    };
  }

  /**
   * Full pipeline: Gemini vision -> StyleSpecV1 -> renderer outputs.
   */
  async extractStyle(imageBase64: string, styleName?: string): Promise<StyleSpecV1> {
    const partialSpec = await this.analyzeImage(imageBase64);
    return assembleSpec(partialSpec, {
      styleName,
      sourceType: 'image',
      thumbnailRef: imageBase64,
      rawAiResponse: partialSpec.meta?.rawAiResponse,
    });
  }
}

/**
 * Robust JSON parser for AI responses.
 */
export function parseJSON(text: string): unknown {
  if (!text) throw new Error('Empty response from AI');

  try { return JSON.parse(text); } catch {}

  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]); } catch {}
  }

  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    const candidate = text.substring(braceStart, braceEnd + 1);
    try { return JSON.parse(candidate); } catch {}
  }

  throw new Error(`Failed to parse AI JSON response (length=${text.length}): ${text.substring(0, 300)}`);
}

export default AIClient;
