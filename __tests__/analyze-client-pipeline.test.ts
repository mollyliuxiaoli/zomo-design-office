import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const analyzePageSource = () => readFileSync(join(process.cwd(), 'app/analyze/page.tsx'), 'utf8');

describe('analyze client vision pipeline', () => {
  it('keeps provider calls server-side so user browsers only call the same-origin analysis API', () => {
    const source = analyzePageSource();

    expect(source).toContain("'/api/analyze-style'");
    expect(source).not.toContain('https://api.apimart.ai/v1/chat/completions');
    expect(source).not.toContain("'/api/token'");
    expect(source).not.toContain('Authorization: `Bearer ${apiKey}`');
  });
});
