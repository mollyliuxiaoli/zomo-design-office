import { describe, expect, it } from 'vitest';
import {
  ANALYZE_MODE_ORDER,
  canAnalyzeMode,
  createInitialAnalyzeStates,
  getAnalyzeCopy,
  getStyleAnalysisPrompt,
} from '@/app/lib/analyze/modes';
import { normalizeLanguage } from '@/app/lib/i18n';

describe('analyze mode information architecture', () => {
  it('defines three modes with distinct jobs and inputs in both languages', () => {
    for (const lang of ['zh', 'en'] as const) {
      const copy = getAnalyzeCopy(lang);
      const titles = ANALYZE_MODE_ORDER.map((mode) => copy.modes[mode].title);
      const jobs = ANALYZE_MODE_ORDER.map((mode) => copy.modes[mode].job);
      const inputLabels = ANALYZE_MODE_ORDER.map((mode) => copy.modes[mode].primaryInputLabel);

      expect(new Set(titles).size).toBe(3);
      expect(new Set(jobs).size).toBe(3);
      expect(inputLabels).toEqual(
        lang === 'zh'
          ? ['上传或粘贴图片', '上传或粘贴截图', '输入网页 URL']
          : ['Upload or paste an image', 'Upload or paste a screenshot', 'Enter a website URL']
      );
    }
  });

  it('keeps per-mode form and task state isolated', () => {
    const states = createInitialAnalyzeStates();
    states.image.preview = 'data:image/jpeg;base64,image';
    states.image.status = 'running';
    states.image.progress = 'AI 分析中';

    expect(states.screenshot.preview).toBe('');
    expect(states.url.preview).toBe('');
    expect(states.url.status).toBe('idle');
    expect(states.url.progress).toBe('');
  });

  it('only enables the active mode when that mode has its required input and no other run is active', () => {
    const states = createInitialAnalyzeStates();
    states.image.preview = 'data:image/png;base64,abc';
    states.url.targetUrl = 'https://example.com';

    expect(canAnalyzeMode('image', states.image, null)).toBe(true);
    expect(canAnalyzeMode('url', states.url, null)).toBe(true);
    expect(canAnalyzeMode('screenshot', states.screenshot, null)).toBe(false);
    expect(canAnalyzeMode('url', states.url, 'image')).toBe(false);
  });

  it('uses mode-specific prompts so screenshot restoration is not just a renamed image analysis', () => {
    const imagePrompt = getStyleAnalysisPrompt('image');
    const screenshotPrompt = getStyleAnalysisPrompt('screenshot');

    expect(imagePrompt).not.toBe(screenshotPrompt);
    expect(imagePrompt).toContain('design tokens');
    expect(screenshotPrompt).toContain('restoration');
    expect(imagePrompt.length).toBeLessThan(1800);
    expect(screenshotPrompt.length).toBeLessThan(1800);
  });
});

describe('language normalization', () => {
  it('defaults to Chinese and accepts English toggle values', () => {
    expect(normalizeLanguage(undefined)).toBe('zh');
    expect(normalizeLanguage('')).toBe('zh');
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('zh')).toBe('zh');
    expect(normalizeLanguage('fr')).toBe('zh');
  });
});
