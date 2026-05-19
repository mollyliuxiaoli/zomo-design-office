/**
 * Templates for structured output in page reverse engineering and style extraction
 */

export interface PageStructure {
  sections: Section[];
  globalStyles: GlobalStyles;
  interactions: Interaction[];
}

export interface Section {
  id: string;
  type: string;
  position: 'header' | 'hero' | 'content' | 'feature' | 'cta' | 'footer';
  content: string[];
  layout: {
    width: string;
    alignment: string;
    columns?: number;
  };
  styling: {
    backgroundColor?: string;
    padding?: string;
    margin?: string;
  };
}

export interface GlobalStyles {
  colors: {
    primary: string[];
    secondary: string[];
    background: string[];
    text: string[];
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    headingWeights: number[];
    bodyWeights: number[];
  };
  spacing: {
    section: string;
    container: string;
    element: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: string[];
}

export interface Interaction {
  element: string;
  type: 'hover' | 'click' | 'scroll' | 'animation';
  description: string;
}

/**
 * Template for page structure analysis JSON schema
 */
export const PAGE_STRUCTURE_TEMPLATE = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          position: {
            type: "string",
            enum: ["header", "hero", "content", "feature", "cta", "footer"]
          },
          content: { type: "array", items: { type: "string" } },
          layout: {
            type: "object",
            properties: {
              width: { type: "string" },
              alignment: { type: "string" },
              columns: { type: "number" }
            }
          },
          styling: {
            type: "object",
            properties: {
              backgroundColor: { type: "string" },
              padding: { type: "string" },
              margin: { type: "string" }
            }
          }
        }
      }
    },
    globalStyles: {
      type: "object",
      properties: {
        colors: {
          type: "object",
          properties: {
            primary: { type: "array", items: { type: "string" } },
            secondary: { type: "array", items: { type: "string" } },
            background: { type: "array", items: { type: "string" } },
            text: { type: "array", items: { type: "string" } }
          }
        },
        typography: {
          type: "object",
          properties: {
            headingFont: { type: "string" },
            bodyFont: { type: "string" },
            headingWeights: { type: "array", items: { type: "number" } },
            bodyWeights: { type: "array", items: { type: "number" } }
          }
        },
        spacing: {
          type: "object",
          properties: {
            section: { type: "string" },
            container: { type: "string" },
            element: { type: "string" }
          }
        },
        borderRadius: {
          type: "object",
          properties: {
            sm: { type: "string" },
            md: { type: "string" },
            lg: { type: "string" }
          }
        },
        shadows: { type: "array", items: { type: "string" } }
      }
    },
    interactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          element: { type: "string" },
          type: {
            type: "string",
            enum: ["hover", "click", "scroll", "animation"]
          },
          description: { type: "string" }
        }
      }
    }
  }
};

/**
 * CSS variables template for consistent design tokens
 */
export const CSS_VARIABLES_TEMPLATE = (styles: GlobalStyles): string => {
  return `:root {
  /* Colors */
  --color-primary-50: ${styles.colors.primary[0] || '#f0f9ff'};
  --color-primary-100: ${styles.colors.primary[1] || '#e0f2fe'};
  --color-primary-500: ${styles.colors.primary[2] || '#0ea5e9'};
  --color-primary-600: ${styles.colors.primary[3] || '#0284c7'};
  --color-primary-700: ${styles.colors.primary[4] || '#0369a1'};

  --color-secondary-50: ${styles.colors.secondary[0] || '#faf5ff'};
  --color-secondary-100: ${styles.colors.secondary[1] || '#f3e8ff'};
  --color-secondary-500: ${styles.colors.secondary[2] || '#a855f7'};
  --color-secondary-600: ${styles.colors.secondary[3] || '#9333ea'};

  --color-background: ${styles.colors.background[0] || '#ffffff'};
  --color-background-alt: ${styles.colors.background[1] || '#f8fafc'};
  --color-text: ${styles.colors.text[0] || '#0f172a'};
  --color-text-muted: ${styles.colors.text[1] || '#64748b'};

  /* Typography */
  --font-heading: '${styles.typography.headingFont || 'Inter, sans-serif'}';
  --font-body: '${styles.typography.bodyFont || 'Inter, sans-serif'}';

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;

  /* Spacing */
  --spacing-section: ${styles.spacing.section || '4rem'};
  --spacing-container: ${styles.spacing.container || '1.5rem'};
  --spacing-element: ${styles.spacing.element || '1rem'};

  /* Border Radius */
  --radius-sm: ${styles.borderRadius.sm || '0.25rem'};
  --radius-md: ${styles.borderRadius.md || '0.5rem'};
  --radius-lg: ${styles.borderRadius.lg || '1rem'};

  /* Shadows */
  --shadow-sm: ${styles.shadows[0] || '0 1px 2px 0 rgb(0 0 0 / 0.05)'};
  --shadow-md: ${styles.shadows[1] || '0 4px 6px -1px rgb(0 0 0 / 0.1)'};
  --shadow-lg: ${styles.shadows[2] || '0 10px 15px -3px rgb(0 0 0 / 0.1)'};
  --shadow-xl: ${styles.shadows[3] || '0 20px 25px -5px rgb(0 0 0 / 0.1)'};
}`;
};

/**
 * Page rebuild prompt template for LLM reconstruction
 */
export const REBUILD_PROMPT_TEMPLATE = (structure: PageStructure, screenshot?: string): string => {
  const sections = structure.sections.map(section => {
    return `## ${section.position.charAt(0).toUpperCase() + section.position.slice(1)} Section
- Type: ${section.type}
- Content: ${section.content.join(', ')}
- Layout: ${section.layout.width} width, ${section.layout.alignment}${section.layout.columns ? `, ${section.layout.columns} columns` : ''}
- Styling: ${Object.entries(section.styling).map(([key, value]) => `${key}: ${value}`).join(', ')}`;
  }).join('\n\n');

  return `# Page Rebuild Prompt

You are tasked with recreating a webpage based on the following analysis. Build a modern, responsive implementation using HTML, CSS, and JavaScript.

## Overview
Create a ${structure.sections.length}-section webpage with ${structure.globalStyles.typography.headingFont} headings and ${structure.globalStyles.typography.bodyFont} body text.

## Color System
Primary Colors: ${structure.globalStyles.colors.primary.join(', ')}
Secondary Colors: ${structure.globalStyles.colors.secondary.join(', ')}
Background: ${structure.globalStyles.colors.background.join(', ')}
Text: ${structure.globalStyles.colors.text.join(', ')}

## Typography
- Heading Font: ${structure.globalStyles.typography.headingFont}
- Body Font: ${structure.globalStyles.typography.bodyFont}
- Heading Weights: ${structure.globalStyles.typography.headingWeights.join(', ')}
- Body Weights: ${structure.globalStyles.typography.bodyWeights.join(', ')}

## Spacing System
- Section spacing: ${structure.globalStyles.spacing.section}
- Container padding: ${structure.globalStyles.spacing.container}
- Element spacing: ${structure.globalStyles.spacing.element}

## Border Radius
- Small: ${structure.globalStyles.borderRadius.sm}
- Medium: ${structure.globalStyles.borderRadius.md}
- Large: ${structure.globalStyles.borderRadius.lg}

## Sections (Top to Bottom)
${sections}

## Interactions & Animations
${structure.interactions.map(interaction =>
  `- **${interaction.element}**: ${interaction.type} - ${interaction.description}`
).join('\n')}

## Technical Requirements
- Use CSS custom properties (variables) for colors, spacing, and typography
- Implement responsive design (mobile-first approach)
- Use semantic HTML5 elements
- Include smooth scrolling and hover states
- Add entrance animations using CSS keyframes or transitions
- Ensure accessibility (ARIA labels, focus states, proper contrast)

${screenshot ? `\n## Reference
A screenshot is available for visual reference. Use it to verify layout, spacing, and visual hierarchy.` : ''}

Please generate complete, production-ready code that implements this design.`;
};

/**
 * Style analysis prompt for vision model
 */
export const STYLE_ANALYSIS_PROMPT = `Analyze this design image and extract the following information in JSON format:

{
  "colorPalette": {
    "primary": ["#hex1", "#hex2", "#hex3"],
    "secondary": ["#hex1", "#hex2"],
    "background": ["#hex1", "#hex2"],
    "accent": ["#hex1"]
  },
  "typography": {
    "headings": "font description (e.g., 'Bold Inter, 48px, letter-spacing -0.02em')",
    "body": "font description (e.g., 'Regular Inter, 16px, line-height 1.6')",
    "characteristics": ["characteristic1", "characteristic2"]
  },
  "layout": {
    "structure": ["Hero section with centered content", "Feature grid with 3 columns", "CTA section with background color"],
    "gridType": "grid description (e.g., '12-column grid with 1.5rem gaps')",
    "spacing": "spacing description (e.g., 'Generous whitespace, 4rem section padding')",
    "alignment": "alignment description (e.g., 'Center-aligned hero, left-aligned content')"
  },
  "visualStyle": {
    "tags": ["minimalist", "modern", "clean"],
    "mood": "overall mood (e.g., 'Professional and approachable')",
    "aesthetic": "aesthetic description (e.g., 'Contemporary SaaS aesthetic with subtle gradients')"
  },
  "content": {
    "headings": ["Main heading text", "Subheading text"],
    "bodyText": ["Body text snippet 1", "Body text snippet 2"],
    "buttons": ["Get Started", "Learn More"]
  }
}

Please provide accurate hex codes with 6 digits, detailed font descriptions, and comprehensive analysis.`;

/**
 * Code generation prompt for Claude
 */
export const CODE_GENERATION_PROMPT = (analysis: any): string => {
  return `You are a design system expert. Based on the following design analysis, generate:

1. A complete CSS variables section with proper color system, typography scale, spacing tokens
2. A markdown documentation describing the design system
3. An AI prompt that can be used to recreate this design

Design Analysis:
${JSON.stringify(analysis, null, 2)}

Please respond with a JSON object in this exact format:
{
  "cssContent": "Complete CSS with :root variables, including colors, typography, spacing, and utility classes",
  "markdownContent": "# Design System Documentation\\n\\n## Color Palette\\n\\n...",
  "promptContent": "A detailed prompt that another AI can use to recreate this design, including layout structure, colors, typography, spacing, and visual style"
}

Make the CSS production-ready with proper naming conventions. Include:
- CSS custom properties for all design tokens
- Color system with semantic naming (primary, secondary, background, text)
- Typography scale with line heights and letter spacing
- Spacing scale (consistent margin/padding values)
- Utility classes for common patterns
- Responsive breakpoints

The markdown should be comprehensive documentation covering:
- Color palette with hex codes and usage guidelines
- Typography system with font families and scales
- Spacing and layout patterns
- Component examples
- Usage guidelines

The prompt should be detailed enough that another AI can recreate the entire design from scratch.`;
};