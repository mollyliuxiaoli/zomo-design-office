import type { StyleSpecV1 } from '@/app/lib/spec/types';

const fallbackFont = 'Inter';

function first(values: string[] | undefined, fallback: string): string {
  return values && values.length > 0 ? values[0] : fallback;
}

function cssList(values: string[] | undefined): string {
  return (values || []).join(', ');
}

function radiusValue(spec: StyleSpecV1, index: number, fallback: string): string {
  return spec.radius.values?.[index] || fallback;
}

function shadowValue(style: StyleSpecV1['shadow']['style']): string {
  if (style === 'none') return 'none';
  if (style === 'crisp') return '0 2px 0 rgb(0 0 0 / 0.16)';
  if (style === 'dramatic') return '0 24px 60px rgb(0 0 0 / 0.22)';
  return '0 12px 30px rgb(15 23 42 / 0.12)';
}

function containerValue(container: StyleSpecV1['layout']['container']): string {
  if (container === 'narrow') return '720px';
  if (container === 'wide') return '1280px';
  if (container === 'full') return '100%';
  return '1040px';
}

function spacingValue(density: StyleSpecV1['spacing']['density']): string {
  if (density === 'compact') return '0.75rem';
  if (density === 'spacious') return '1.5rem';
  return '1rem';
}

export function renderCssVariables(spec: StyleSpecV1): string {
  const baseSpacing = spec.spacing.baseUnit || spacingValue(spec.spacing.density);
  const headingFont = first(spec.typography.suggestedFonts, fallbackFont);
  const bodyFont = spec.typography.suggestedFonts[1] || headingFont;

  return `:root {
  --color-background: ${first(spec.colors.background, '#ffffff')};
  --color-background-alt: ${spec.colors.background[1] || '#f8fafc'};
  --color-foreground: ${first(spec.colors.foreground, '#0f172a')};
  --color-muted: ${spec.colors.foreground[1] || '#64748b'};
  --color-primary: ${first(spec.colors.primary, '#2563eb')};
  --color-primary-alt: ${spec.colors.primary[1] || first(spec.colors.primary, '#2563eb')};
  --color-secondary: ${first(spec.colors.secondary, '#7c3aed')};
  --color-accent: ${first(spec.colors.accent, '#f59e0b')};
  --color-border: ${first(spec.colors.border, '#e2e8f0')};
  --color-success: ${spec.colors.semantic?.success || '#16a34a'};
  --color-warning: ${spec.colors.semantic?.warning || '#d97706'};
  --color-danger: ${spec.colors.semantic?.danger || '#dc2626'};
  --color-info: ${spec.colors.semantic?.info || '#0284c7'};
  --palette-primary: ${cssList(spec.colors.primary)};
  --palette-secondary: ${cssList(spec.colors.secondary)};
  --palette-accent: ${cssList(spec.colors.accent)};

  --font-heading: '${headingFont}', sans-serif;
  --font-body: '${bodyFont}', sans-serif;
  --font-weight-heading: ${spec.typography.headingWeight};
  --font-weight-body: ${spec.typography.bodyWeight};
  --letter-spacing: ${spec.typography.letterSpacing};
  --line-height: ${spec.typography.lineHeight};

  --spacing-base: ${baseSpacing};
  --spacing-section: calc(var(--spacing-base) * 6);
  --spacing-container: calc(var(--spacing-base) * 2);
  --spacing-element: var(--spacing-base);

  --radius-sm: ${radiusValue(spec, 0, '4px')};
  --radius-md: ${radiusValue(spec, 1, '8px')};
  --radius-lg: ${radiusValue(spec, 2, '16px')};
  --shadow-style: ${shadowValue(spec.shadow.style)};
  --container-max-width: ${containerValue(spec.layout.container)};
}`;
}

