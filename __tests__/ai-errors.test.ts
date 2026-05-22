import { describe, expect, it } from 'vitest';
import {
  extractAIErrorMessage,
  getAIUserErrorMessage,
  isRetryableAIError,
} from '@/app/lib/ai-errors';

describe('AI provider error handling', () => {
  it('extracts nested provider messages instead of exposing raw JSON', () => {
    const body = JSON.stringify({ error: { message: 'UnknownError Internal error. UnknownError: Internal error.' } });
    expect(extractAIErrorMessage(body)).toBe('UnknownError Internal error. UnknownError: Internal error.');
  });

  it('treats provider internal errors and timeouts as retryable', () => {
    expect(isRetryableAIError('UnknownError Internal error.')).toBe(true);
    expect(isRetryableAIError('request timeout')).toBe(true);
    expect(isRetryableAIError('AI response truncated (finish_reason=length)')).toBe(true);
    expect(isRetryableAIError('AI 服务临时失败。系统已自动重试；请再试一次。')).toBe(true);
    expect(isRetryableAIError('invalid api key')).toBe(false);
  });

  it('maps provider internal errors to actionable Chinese and English copy', () => {
    const raw = 'UnknownError Internal error. UnknownError: Internal error.';
    expect(getAIUserErrorMessage(raw, 'zh')).toContain('AI 服务临时失败');
    expect(getAIUserErrorMessage(raw, 'en')).toContain('AI service failed temporarily');
    expect(getAIUserErrorMessage(raw, 'zh')).not.toContain('UnknownError');
  });
});
