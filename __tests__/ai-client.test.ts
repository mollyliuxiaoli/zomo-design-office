import { describe, it, expect } from 'vitest';
import { normalizeSpec, withDerived, parseJSON, assembleSpec } from '@/app/lib/ai-client';
import type { StyleSpecV1, StyleSpecV1Input } from '@/app/lib/spec/types';

// Minimal valid spec for reuse
function makeMinimalSpec(overrides: StyleSpecV1Input = {}): StyleSpecV1 {
  return normalizeSpec(overrides);
}

describe('normalizeSpec', () => {
  it('produces a valid StyleSpecV1 from empty input', () => {
    const spec = normalizeSpec({});
    expect(spec.specVersion).toBe('1.0');
    expect(spec.styleId).toBeTruthy();
    expect(spec.styleName).toBe('Unnamed Style');
    expect(spec.source.type).toBe('image');
    expect(spec.colors.primary).toEqual(['#2563eb']);
    expect(spec.typography.fontStyle).toBe('sans');
    expect(spec.spacing.density).toBe('comfortable');
    expect(spec.radius.style).toBe('subtle');
    expect(spec.shadow.style).toBe('soft');
    expect(spec.meta.confidence).toBeGreaterThanOrEqual(0);
    expect(spec.meta.confidence).toBeLessThanOrEqual(100);
  });

  it('preserves valid values from input', () => {
    const spec = normalizeSpec({
      styleName: 'Linear App',
      colors: { primary: ['#5438DC'], secondary: ['#7C3AED'] },
      typography: { fontStyle: 'mono', headingWeight: '800' },
      spacing: { density: 'compact' },
    });
    expect(spec.styleName).toBe('Linear App');
    expect(spec.colors.primary).toEqual(['#5438DC']);
    expect(spec.colors.secondary).toEqual(['#7C3AED']);
    expect(spec.typography.fontStyle).toBe('mono');
    expect(spec.typography.headingWeight).toBe('800');
    expect(spec.spacing.density).toBe('compact');
  });

  it('clamps confidence to 0-100', () => {
    expect(normalizeSpec({ meta: { confidence: -10 } }).meta.confidence).toBe(0);
    expect(normalizeSpec({ meta: { confidence: 150 } }).meta.confidence).toBe(100);
    expect(normalizeSpec({ meta: { confidence: 85 } }).meta.confidence).toBe(85);
  });

  it('defaults invalid enum values', () => {
    const spec = normalizeSpec({
      // @ts-expect-error — testing invalid input
      typography: { fontStyle: 'invalid', letterSpacing: 'bad' },
      // @ts-expect-error
      spacing: { density: 'weird' },
      // @ts-expect-error
      radius: { style: 'super-round' },
    });
    expect(spec.typography.fontStyle).toBe('sans');
    expect(spec.typography.letterSpacing).toBe('normal');
    expect(spec.spacing.density).toBe('comfortable');
    expect(spec.radius.style).toBe('subtle');
  });

  it('handles null/undefined inputs gracefully', () => {
    const spec = normalizeSpec({
      colors: { primary: undefined as any, secondary: null as any },
      typography: { suggestedFonts: undefined as any },
    });
    expect(spec.colors.primary).toEqual(['#2563eb']);
    expect(spec.colors.secondary).toEqual(['#7c3aed']);
    expect(spec.typography.suggestedFonts).toEqual(['Inter', 'Arial']);
  });

  it('filters non-string array items', () => {
    const spec = normalizeSpec({
      vibe: { keywords: ['modern', 42, null, '', 'clean'] as any, description: 'test' },
    });
    expect(spec.vibe.keywords).toEqual(['modern', 'clean']);
  });

  it('handles sections with content arrays', () => {
    const spec = normalizeSpec({
      layout: {
        sections: [
          { position: 'header', description: 'Main nav', content: ['Home', 'About'] },
          { position: 'hero', description: 'Hero section' },
        ],
      },
    });
    expect(spec.layout.sections).toHaveLength(2);
    expect(spec.layout.sections![0].content).toEqual(['Home', 'About']);
    expect(spec.layout.sections![1].content).toBeUndefined();
  });

  it('falls back to default when sections is empty array', () => {
    const spec = normalizeSpec({ layout: { sections: [] } });
    expect(spec.layout.sections).toBeUndefined();
  });

  it('handles semantic colors', () => {
    const spec = normalizeSpec({
      colors: {
        semantic: { success: '#22c55e', danger: '#ef4444' },
      },
    });
    expect(spec.colors.semantic?.success).toBe('#22c55e');
    expect(spec.colors.semantic?.danger).toBe('#ef4444');
    expect(spec.colors.semantic?.warning).toBe('#d97706'); // default
  });
});

describe('withDerived', () => {
  it('adds all 7 derived outputs', () => {
    const spec = withDerived(makeMinimalSpec({ styleName: 'Test' }));
    expect(spec.derived).toBeDefined();
    expect(spec.derived!.cssVariables).toBeTruthy();
    expect(spec.derived!.markdown).toBeTruthy();
    expect(spec.derived!.restorationPrompt).toBeTruthy();
    expect(spec.derived!.tailwindConfig).toBeTruthy();
    expect(spec.derived!.tailwindExample).toBeTruthy();
    expect(spec.derived!.shadcnTheme).toBeTruthy();
    expect(spec.derived!.shadcnConfig).toBeTruthy();
  });

  it('includes style name in derived outputs', () => {
    const spec = withDerived(makeMinimalSpec({ styleName: 'Stripe' }));
    expect(spec.derived!.markdown).toContain('Stripe');
    expect(spec.derived!.restorationPrompt).toContain('Stripe');
  });

  it('does not crash on minimal spec', () => {
    expect(() => withDerived(makeMinimalSpec())).not.toThrow();
  });
});

describe('parseJSON', () => {
  it('parses clean JSON', () => {
    expect(parseJSON('{"key": "value"}')).toEqual({ key: 'value' });
  });

  it('strips markdown code blocks', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(parseJSON(input)).toEqual({ key: 'value' });
  });

  it('extracts JSON from surrounding text', () => {
    const input = 'Here is the result:\n{"key": "value"}\nDone.';
    expect(parseJSON(input)).toEqual({ key: 'value' });
  });

  it('throws on empty string', () => {
    expect(() => parseJSON('')).toThrow('Empty response');
  });

  it('throws on completely invalid input', () => {
    expect(() => parseJSON('not json at all')).toThrow('Failed to parse');
  });
});

describe('assembleSpec', () => {
  it('assembles with options', () => {
    const spec = assembleSpec(
      { styleName: 'Test', colors: { primary: ['#ff0000'] } },
      { sourceType: 'url', originalUrl: 'https://example.com' }
    );
    expect(spec.source.type).toBe('url');
    expect(spec.source.originalUrl).toBe('https://example.com');
    expect(spec.styleName).toBe('Test');
    expect(spec.derived).toBeDefined();
  });

  it('generates unique styleId', () => {
    const a = assembleSpec({ styleName: 'A' });
    const b = assembleSpec({ styleName: 'B' });
    expect(a.styleId).not.toBe(b.styleId);
  });

  it('preserves source metadata when options are omitted', () => {
    const spec = assembleSpec({
      styleName: 'From URL',
      source: {
        type: 'url',
        originalUrl: 'https://example.com',
        thumbnailRef: 'https://example.com/og.png',
      },
    });

    expect(spec.source.type).toBe('url');
    expect(spec.source.originalUrl).toBe('https://example.com');
    expect(spec.source.thumbnailRef).toBe('https://example.com/og.png');
  });
});
