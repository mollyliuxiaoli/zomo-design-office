export type Language = 'zh' | 'en';

export const DEFAULT_LANGUAGE: Language = 'zh';
export const LANGUAGE_STORAGE_KEY = 'distill-language';

export function normalizeLanguage(value: unknown): Language {
  return value === 'en' || value === 'zh' ? value : DEFAULT_LANGUAGE;
}

export const NAV_COPY: Record<Language, {
  homeAria: string;
  items: Array<{ href: string; label: string }>;
  primaryCta: string;
  languageLabel: string;
}> = {
  zh: {
    homeAria: 'Distill 首页',
    items: [
      { href: '/library', label: '库' },
      { href: '/analyze', label: '分析' },
      { href: '/styles/linear-app', label: '案例' },
      { href: '/compare', label: '对比' },
    ],
    primaryCta: '上传截图',
    languageLabel: '切换语言',
  },
  en: {
    homeAria: 'Distill home',
    items: [
      { href: '/library', label: 'Library' },
      { href: '/analyze', label: 'Analyze' },
      { href: '/styles/linear-app', label: 'Examples' },
      { href: '/compare', label: 'Compare' },
    ],
    primaryCta: 'Upload screenshot',
    languageLabel: 'Switch language',
  },
};
