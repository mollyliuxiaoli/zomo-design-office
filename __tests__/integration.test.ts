import { describe, it, expect } from 'vitest';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { normalizeSpec, withDerived } from '@/app/lib/ai-client';

describe('share token round-trip', () => {
  it('compresses and decompresses a spec', () => {
    const spec = withDerived(normalizeSpec({ styleName: 'Linear' }));
    const payload = JSON.stringify({ spec, title: 'Linear' });
    const compressed = compressToEncodedURIComponent(payload);
    const decompressed = decompressFromEncodedURIComponent(compressed);
    const parsed = JSON.parse(decompressed);
    expect(parsed.title).toBe('Linear');
    expect(parsed.spec.styleName).toBe('Linear');
  });

  it('handles empty decompression', () => {
    const result = decompressFromEncodedURIComponent('');
    // lz-string returns null for empty input
    expect(result === null || result === '').toBe(true);
  });

  it('handles invalid decompression gracefully', () => {
    const result = decompressFromEncodedURIComponent('not-valid-base64!!!');
    expect(result === null || typeof result === 'string').toBe(true);
  });
});

describe('demo styles data integrity', () => {
  it('all demo styles have required fields', async () => {
    // Use dynamic import with @ alias
    const demos = (await import('@/public/demo-styles/index.json')).default;
    expect(demos.length).toBeGreaterThan(0);

    for (const demo of demos) {
      expect(demo.id).toBeTruthy();
      expect(demo.title).toBeTruthy();
      expect(demo.spec).toBeDefined();
      expect(demo.spec.styleName).toBeTruthy();
      expect(demo.spec.colors).toBeDefined();
      expect(demo.spec.typography).toBeDefined();
      expect(demo.spec.vibe).toBeDefined();
      expect(demo.spec.vibe.keywords).toBeInstanceOf(Array);
    }
  });

  it('all demo styles can be normalized', async () => {
    const demos = (await import('@/public/demo-styles/index.json')).default;
    for (const demo of demos) {
      expect(() => normalizeSpec(demo.spec)).not.toThrow();
    }
  });

  it('all demo styles can have derived outputs generated', async () => {
    const demos = (await import('@/public/demo-styles/index.json')).default;
    for (const demo of demos) {
      const spec = normalizeSpec(demo.spec);
      expect(() => withDerived(spec)).not.toThrow();
      const derived = withDerived(spec);
      expect(derived.derived!.cssVariables).toBeTruthy();
      expect(derived.derived!.markdown).toBeTruthy();
    }
  });

  it('each demo style has unique id', async () => {
    const demos = (await import('@/public/demo-styles/index.json')).default;
    const ids = demos.map((d: any) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
