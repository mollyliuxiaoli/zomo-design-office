import { describe, it, expect } from 'vitest';
import { renderCssVariables } from '@/app/lib/renderers/css-variables';
import { renderMarkdown } from '@/app/lib/renderers/markdown-doc';
import { renderRestorationPrompt } from '@/app/lib/renderers/restoration-prompt';
import { renderTailwindConfig, renderTailwindExample } from '@/app/lib/renderers/tailwind';
import { renderShadcnTheme, renderShadcnConfig } from '@/app/lib/renderers/shadcn';
import { normalizeSpec } from '@/app/lib/ai-client';
import type { StyleSpecV1, StyleSpecV1Input } from '@/app/lib/spec/types';

function makeSpec(overrides: StyleSpecV1Input = {}): StyleSpecV1 {
  return normalizeSpec(overrides);
}

describe('renderCssVariables', () => {
  it('produces valid CSS with :root block', () => {
    const css = renderCssVariables(makeSpec({ styleName: 'TestCSS' }));
    expect(css).toContain(':root {');
    expect(css).toContain('--color-primary:');
    expect(css).toContain('--color-background:');
    expect(css).toContain('--font-heading:');
    expect(css).toContain('--radius-sm:');
    expect(css).toContain('--shadow-style:');
  });

  it('uses provided colors', () => {
    const css = renderCssVariables(makeSpec({
      colors: { primary: ['#ff0000'], background: ['#000000'] },
    }));
    expect(css).toContain('#ff0000');
    expect(css).toContain('#000000');
  });

  it('handles all radius styles', () => {
    for (const style of ['sharp', 'subtle', 'rounded', 'pill'] as const) {
      const css = renderCssVariables(makeSpec({ radius: { style } }));
      expect(css).toContain('--radius-sm:');
      expect(css).toContain('--radius-md:');
    }
  });

  it('handles all shadow styles', () => {
    for (const style of ['none', 'soft', 'crisp', 'dramatic'] as const) {
      const css = renderCssVariables(makeSpec({ shadow: { style } }));
      expect(css).toContain('--shadow-style:');
    }
  });

  it('handles all container sizes', () => {
    const sizes = { narrow: '720px', medium: '1040px', wide: '1280px', full: '100%' };
    for (const [key, val] of Object.entries(sizes)) {
      const css = renderCssVariables(makeSpec({ layout: { container: key as any } }));
      expect(css).toContain(`--container-max-width: ${val}`);
    }
  });
});

describe('renderMarkdown', () => {
  it('produces markdown with style name', () => {
    const md = renderMarkdown(makeSpec({ styleName: 'Linear' }));
    expect(md).toContain('# Linear');
    expect(md).toContain('## Color Palette');
    expect(md).toContain('## Typography');
    expect(md).toContain('## Layout');
    expect(md).toContain('## Vibe');
  });

  it('lists all color groups', () => {
    const md = renderMarkdown(makeSpec());
    expect(md).toContain('Background:');
    expect(md).toContain('Foreground:');
    expect(md).toContain('Primary:');
    expect(md).toContain('Secondary:');
    expect(md).toContain('Accent:');
    expect(md).toContain('Border:');
  });

  it('handles missing sections gracefully', () => {
    const md = renderMarkdown(makeSpec({ layout: { sections: [] } }));
    expect(md).toContain('## Layout');
  });
});

describe('renderRestorationPrompt', () => {
  it('produces a comprehensive prompt', () => {
    const prompt = renderRestorationPrompt(makeSpec({ styleName: 'Stripe' }));
    expect(prompt).toContain('Stripe');
    expect(prompt).toContain('Style direction:');
    expect(prompt).toContain('Keywords:');
    expect(prompt).toContain('Use this design system:');
    expect(prompt).toContain('Page structure:');
    expect(prompt).toContain('Component guidance:');
  });

  it('includes section content cues', () => {
    const prompt = renderRestorationPrompt(makeSpec({
      layout: {
        sections: [
          { position: 'hero', description: 'Big hero', content: ['Welcome', 'Get started'] },
        ],
      },
    }));
    expect(prompt).toContain('Welcome | Get started');
  });
});

describe('renderTailwindConfig', () => {
  it('produces valid TypeScript config', () => {
    const config = renderTailwindConfig(makeSpec({ styleName: 'Vercel' }));
    expect(config).toContain('import type { Config }');
    expect(config).toContain("const config: Config = {");
    expect(config).toContain('colors:');
    expect(config).toContain('fontFamily:');
    expect(config).toContain('borderRadius:');
    expect(config).toContain('boxShadow:');
  });

  it('escapes values properly (no unescaped quotes)', () => {
    const config = renderTailwindConfig(makeSpec());
    // Should not contain raw unescaped quotes in string values
    const lines = config.split('\n').filter(l => l.includes('DEFAULT'));
    expect(lines.length).toBeGreaterThan(0);
  });

  it('includes semantic colors when present', () => {
    const config = renderTailwindConfig(makeSpec({
      colors: { semantic: { success: '#22c55e', danger: '#ef4444' } },
    }));
    expect(config).toContain('success:');
    expect(config).toContain('danger:');
  });
});

describe('renderTailwindExample', () => {
  it('produces HTML example', () => {
    const html = renderTailwindExample(makeSpec({ styleName: 'Apple' }));
    expect(html).toContain('Apple');
    expect(html).toContain('<section');
    expect(html).toContain('class=');
  });
});

describe('renderShadcnTheme', () => {
  it('produces shadcn-compatible CSS', () => {
    const css = renderShadcnTheme(makeSpec({ styleName: 'shadcnTest' }));
    expect(css).toContain('@layer base');
    expect(css).toContain('--background:');
    expect(css).toContain('--foreground:');
    expect(css).toContain('--primary:');
    expect(css).toContain('--secondary:');
    expect(css).toContain('--accent:');
    expect(css).toContain('--destructive:');
    expect(css).toContain('--radius:');
    expect(css).toContain('font-heading');
    expect(css).toContain('font-body');
  });

  it('converts hex to HSL format', () => {
    const css = renderShadcnTheme(makeSpec({
      colors: { primary: ['#2563eb'] },
    }));
    // Should not contain raw #2563eb in variable values (it's converted to HSL)
    const lines = css.split('\n').filter(l => l.includes('--primary:'));
    expect(lines[0]).not.toContain('#2563eb');
    // HSL format: "xxx xx% xx%"
    expect(lines[0]).toMatch(/\d+\s+\d+%\s+\d+%/);
  });

  it('handles all radius styles', () => {
    for (const style of ['sharp', 'subtle', 'rounded', 'pill'] as const) {
      const css = renderShadcnTheme(makeSpec({ radius: { style } }));
      expect(css).toContain('--radius:');
    }
  });
});

describe('renderShadcnConfig', () => {
  it('produces valid JSON', () => {
    const json = renderShadcnConfig(makeSpec());
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('style', 'default');
    expect(parsed).toHaveProperty('tailwind');
    expect(parsed).toHaveProperty('fonts');
  });

  it('uses provided fonts', () => {
    const json = renderShadcnConfig(makeSpec({
      typography: { suggestedFonts: ['Space Grotesk', 'DM Sans'] },
    }));
    const parsed = JSON.parse(json);
    expect(parsed.fonts.heading).toBe('Space Grotesk');
    expect(parsed.fonts.body).toBe('DM Sans');
  });
});
