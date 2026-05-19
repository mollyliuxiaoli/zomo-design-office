import type { StyleSpecV1 } from '@/app/lib/spec/types';

function sentenceList(values: string[] | undefined): string {
  return values && values.length > 0 ? values.join(', ') : 'not specified';
}

export function renderRestorationPrompt(spec: StyleSpecV1): string {
  const sections = spec.layout.sections?.map((section) => {
    const content = section.content && section.content.length > 0
      ? ` Include content cues: ${section.content.join(' | ')}.`
      : '';
    return `- ${section.position}: ${section.description}.${content}`;
  }).join('\n') || '- Build sections that match the captured composition.';

  return `Recreate a responsive web page in the same visual style as "${spec.styleName}".

Style direction: ${spec.vibe.description}
Keywords: ${sentenceList(spec.vibe.keywords)}
Avoid: ${sentenceList(spec.vibe.avoid)}

Use this design system:
- Background colors: ${sentenceList(spec.colors.background)}
- Foreground colors: ${sentenceList(spec.colors.foreground)}
- Primary colors: ${sentenceList(spec.colors.primary)}
- Secondary colors: ${sentenceList(spec.colors.secondary)}
- Accent colors: ${sentenceList(spec.colors.accent)}
- Typography: ${spec.typography.fontStyle} fonts, suggested family ${sentenceList(spec.typography.suggestedFonts)}, ${spec.typography.scale} scale, heading weight ${spec.typography.headingWeight}, body weight ${spec.typography.bodyWeight}, ${spec.typography.lineHeight} line height.
- Spacing: ${spec.spacing.density} density with base unit ${spec.spacing.baseUnit || '8px'}.
- Radius: ${spec.radius.style}${spec.radius.values ? ` using ${spec.radius.values.join(', ')}` : ''}.
- Shadows: ${spec.shadow.style}.
- Container: ${spec.layout.container}; alignment: ${spec.layout.alignment}.

Page structure:
${sections}

Component guidance:
- Buttons: ${spec.components?.buttons || 'match the primary palette and radius style'}
- Cards: ${spec.components?.cards || 'use documented background, border, radius, and shadow tokens'}
- Navigation: ${spec.components?.navigation || 'match the page alignment and typography'}

Return production-ready HTML/CSS or framework code with responsive behavior, accessible contrast, and no placeholder explanation.`;
}

