import type { StyleSpecV1 } from '@/app/lib/spec/types';

/**
 * Tailwind CSS Renderer
 * Generates a tailwind.config.ts + global CSS overrides from a StyleSpecV1.
 * Produces a ready-to-paste Tailwind v3 config object.
 */

function first(values: string[] | undefined, fallback: string): string {
  return values && values.length > 0 ? values[0] : fallback;
}

/** Safely escape a string for JS template output */
function esc(value: string): string {
  return JSON.stringify(value);
}

function fontFamily(spec: StyleSpecV1): { heading: string; body: string } {
  const heading = first(spec.typography.suggestedFonts, 'Inter');
  const body = spec.typography.suggestedFonts[1] || heading;
  return { heading, body };
}

function fontWeight(weight: string): string {
  const map: Record<string, string> = {
    '100': 'thin', '200': 'extralight', '300': 'light', '400': 'normal',
    '500': 'medium', '600': 'semibold', '700': 'bold', '800': 'extrabold', '900': 'black',
  };
  return map[weight] || 'normal';
}

function letterSpacingValue(ls: StyleSpecV1['typography']['letterSpacing']): string {
  if (ls === 'tight') return '-0.025em';
  if (ls === 'wide') return '0.025em';
  return '0em';
}

function lineHeightValue(lh: StyleSpecV1['typography']['lineHeight']): string {
  if (lh === 'compact') return '1.25';
  if (lh === 'relaxed') return '1.75';
  return '1.5';
}

function radiusPreset(style: StyleSpecV1['radius']['style']): { sm: string; md: string; lg: string; full: string } {
  if (style === 'sharp') return { sm: '0', md: '0', lg: '0', full: '9999px' };
  if (style === 'subtle') return { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', full: '9999px' };
  if (style === 'rounded') return { sm: '0.5rem', md: '0.75rem', lg: '1rem', full: '9999px' };
  return { sm: '1rem', md: '1.5rem', lg: '2rem', full: '9999px' };
}

function shadowPreset(style: StyleSpecV1['shadow']['style']): { sm: string; md: string; lg: string } {
  if (style === 'none') return { sm: 'none', md: 'none', lg: 'none' };
  if (style === 'crisp') return { sm: '0 1px 2px rgba(0,0,0,0.1)', md: '0 2px 4px rgba(0,0,0,0.12)', lg: '0 4px 8px rgba(0,0,0,0.15)' };
  if (style === 'dramatic') return { sm: '0 4px 12px rgba(0,0,0,0.15)', md: '0 12px 40px rgba(0,0,0,0.2)', lg: '0 24px 60px rgba(0,0,0,0.25)' };
  return { sm: '0 1px 3px rgba(15,23,42,0.08)', md: '0 4px 12px rgba(15,23,42,0.1)', lg: '0 12px 30px rgba(15,23,42,0.12)' };
}

function containerMaxWidth(container: StyleSpecV1['layout']['container']): string {
  if (container === 'narrow') return '720px';
  if (container === 'wide') return '1280px';
  if (container === 'full') return '100%';
  return '1040px';
}

export function renderTailwindConfig(spec: StyleSpecV1): string {
  const fonts = fontFamily(spec);
  const radii = radiusPreset(spec.radius.style);
  const shadows = shadowPreset(spec.shadow.style);

  const bg = esc(first(spec.colors.background, '#ffffff'));
  const fg = esc(first(spec.colors.foreground, '#0f172a'));
  const fgMuted = esc(spec.colors.foreground[1] || '#64748b');
  const primary = esc(first(spec.colors.primary, '#2563eb'));
  const primaryHover = spec.colors.primary[1] ? `\n          hover: ${esc(spec.colors.primary[1])},` : '';
  const secondary = esc(first(spec.colors.secondary, '#7c3aed'));
  const accent = esc(first(spec.colors.accent, '#f59e0b'));
  const borderColor = esc(first(spec.colors.border, '#e2e8f0'));
  const sem = spec.colors.semantic;
  const semanticBlock = sem ? `
        success: ${esc(sem.success || '#16a34a')},
        warning: ${esc(sem.warning || '#d97706')},
        danger: ${esc(sem.danger || '#dc2626')},
        info: ${esc(sem.info || '#0284c7')},` : '';
  const baseSpacing = esc(spec.spacing.baseUnit || (spec.spacing.density === 'compact' ? '0.75rem' : spec.spacing.density === 'spacious' ? '1.5rem' : '1rem'));

  return `import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      colors: {
        background: ${bg},
        foreground: ${fg},
        muted: ${fgMuted},
        primary: {
          DEFAULT: ${primary},${primaryHover}
        },
        secondary: {
          DEFAULT: ${secondary},
        },
        accent: ${accent},
        border: ${borderColor},${semanticBlock}
      },
      fontFamily: {
        heading: [${esc(fonts.heading)}, 'sans-serif'],
        body: [${esc(fonts.body)}, 'sans-serif'],
      },
      fontWeight: {
        heading: ${esc(spec.typography.headingWeight)},
        body: ${esc(spec.typography.bodyWeight)},
      },
      letterSpacing: {
        tight: ${esc(letterSpacingValue('tight'))},
        normal: ${esc(letterSpacingValue('normal'))},
        wide: ${esc(letterSpacingValue('wide'))},
        spec: ${esc(letterSpacingValue(spec.typography.letterSpacing))},
      },
      lineHeight: {
        spec: ${esc(lineHeightValue(spec.typography.lineHeight))},
      },
      borderRadius: {
        sm: ${esc(radii.sm)},
        md: ${esc(radii.md)},
        lg: ${esc(radii.lg)},
        full: ${esc(radii.full)},
      },
      boxShadow: {
        sm: ${esc(shadows.sm)},
        md: ${esc(shadows.md)},
        lg: ${esc(shadows.lg)},
      },
      maxWidth: {
        container: ${esc(containerMaxWidth(spec.layout.container))},
      },
      spacing: {
        base: ${baseSpacing},
      },
    },
  },
};

export default config;`;
}

/**
 * Generate a usage example with Tailwind classes
 */
export function renderTailwindExample(spec: StyleSpecV1): string {
  const fonts = fontFamily(spec);
  const hw = fontWeight(spec.typography.headingWeight);

  return `<!-- ${spec.styleName} — Tailwind Usage Example -->

<!-- Hero Section -->
<section class="bg-background text-foreground max-w-container mx-auto px-spacing-base">
  <h1 class="font-heading font-${hw} tracking-spec leading-spec">
    ${spec.styleName} Heading
  </h1>
  <p class="font-body text-muted">
    Body text with the ${fonts.body} typeface and muted color.
  </p>
  <button class="bg-primary text-background px-6 py-3 rounded-md shadow-md hover:opacity-90">
    Primary CTA
  </button>
</section>

<!-- Card Component -->
<div class="bg-background border border-border rounded-lg shadow-sm p-spacing-base">
  <h3 class="font-heading font-${hw} text-primary">Card Title</h3>
  <p class="font-body text-muted text-sm">Card description with secondary text color.</p>
</div>

<!-- Navigation -->
<nav class="border-b border-border px-spacing-base py-4">
  <div class="max-w-container mx-auto flex items-center justify-between">
    <span class="font-heading font-${hw}">${spec.styleName}</span>
    <div class="flex gap-6 text-muted">
      <a href="#" class="hover:text-primary">Home</a>
      <a href="#" class="hover:text-primary">About</a>
    </div>
  </div>
</nav>`;
}
