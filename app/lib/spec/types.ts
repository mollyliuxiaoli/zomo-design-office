export type StyleSpecV1 = {
  specVersion: '1.0';
  styleId: string;
  styleName: string;
  source: {
    type: 'image' | 'url' | 'screenshot';
    createdAt: string;
    model: string;
    originalUrl?: string;
    thumbnailRef?: string;
  };
  colors: {
    background: string[];
    foreground: string[];
    primary: string[];
    secondary: string[];
    accent: string[];
    border?: string[];
    semantic?: {
      success?: string;
      warning?: string;
      danger?: string;
      info?: string;
    };
  };
  typography: {
    fontStyle: 'sans' | 'serif' | 'mono' | 'mixed';
    suggestedFonts: string[];
    scale: 'compact' | 'balanced' | 'display';
    headingWeight: string;
    bodyWeight: string;
    letterSpacing: 'tight' | 'normal' | 'wide';
    lineHeight: 'compact' | 'normal' | 'relaxed';
  };
  spacing: {
    density: 'compact' | 'comfortable' | 'spacious';
    baseUnit?: string;
  };
  radius: {
    style: 'sharp' | 'subtle' | 'rounded' | 'pill';
    values?: string[];
  };
  shadow: {
    style: 'none' | 'soft' | 'crisp' | 'dramatic';
  };
  layout: {
    composition: string;
    container: 'narrow' | 'medium' | 'wide' | 'full';
    alignment: 'left' | 'center' | 'mixed';
    sectionCount: number;
    sections?: Array<{
      position: string;
      description: string;
      content?: string[];
    }>;
  };
  components?: {
    buttons?: string;
    cards?: string;
    navigation?: string;
  };
  vibe: {
    keywords: string[];
    description: string;
    avoid?: string[];
  };
  content?: {
    headings?: string[];
    bodyText?: string[];
    buttons?: string[];
  };
  derived?: {
    cssVariables?: string;
    markdown?: string;
    restorationPrompt?: string;
  };
  meta: {
    confidence: number;
    warnings?: string[];
    rendererVersion: string;
    promptVersion: string;
    rawAiResponse?: string;
  };
};

