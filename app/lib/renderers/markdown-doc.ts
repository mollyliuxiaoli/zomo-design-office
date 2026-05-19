import type { StyleSpecV1 } from '@/app/lib/spec/types';

function list(values: string[] | undefined, fallback = 'N/A'): string {
  return values && values.length > 0 ? values.join(', ') : fallback;
}

export function renderMarkdown(spec: StyleSpecV1): string {
  const sections = spec.layout.sections || [];

  return `# ${spec.styleName}

${spec.vibe.description}

## Color Palette

- Background: ${list(spec.colors.background)}
- Foreground: ${list(spec.colors.foreground)}
- Primary: ${list(spec.colors.primary)}
- Secondary: ${list(spec.colors.secondary)}
- Accent: ${list(spec.colors.accent)}
- Border: ${list(spec.colors.border)}

## Typography

- Style: ${spec.typography.fontStyle}
- Suggested fonts: ${list(spec.typography.suggestedFonts)}
- Scale: ${spec.typography.scale}
- Heading weight: ${spec.typography.headingWeight}
- Body weight: ${spec.typography.bodyWeight}
- Letter spacing: ${spec.typography.letterSpacing}
- Line height: ${spec.typography.lineHeight}

## Layout

- Composition: ${spec.layout.composition}
- Container: ${spec.layout.container}
- Alignment: ${spec.layout.alignment}
- Sections: ${spec.layout.sectionCount}
${sections.map((section) => `- ${section.position}: ${section.description}`).join('\n')}

## Shape And Depth

- Density: ${spec.spacing.density}
- Base unit: ${spec.spacing.baseUnit || '8px'}
- Radius: ${spec.radius.style}${spec.radius.values ? ` (${spec.radius.values.join(', ')})` : ''}
- Shadow: ${spec.shadow.style}

## Components

- Buttons: ${spec.components?.buttons || 'Use the primary palette with the documented radius and spacing.'}
- Cards: ${spec.components?.cards || 'Use background, border, radius, and shadow tokens consistently.'}
- Navigation: ${spec.components?.navigation || 'Align with the overall composition and typography.'}

## Vibe

- Keywords: ${list(spec.vibe.keywords)}
- Avoid: ${list(spec.vibe.avoid, 'No explicit avoid list')}
`;
}

