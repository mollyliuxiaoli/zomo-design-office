import type { Language } from '@/app/lib/i18n';

export function extractAIErrorMessage(bodyText: string): string {
  if (!bodyText) return '';

  try {
    const parsed = JSON.parse(bodyText) as unknown;
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const error = record.error;
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object') {
        const errorRecord = error as Record<string, unknown>;
        if (typeof errorRecord.message === 'string') return errorRecord.message;
        if (typeof errorRecord.error === 'string') return errorRecord.error;
      }
      if (typeof record.message === 'string') return record.message;
      if (typeof record.detail === 'string') return record.detail;
      if (typeof record.details === 'string') return record.details;
    }
  } catch {
    // Plain text provider error.
  }

  return bodyText.trim();
}

export function isRetryableAIError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /unknownerror|internal error|timeout|timed out|abort|overloaded|temporarily|temporary|try again|503|502|500|network|networkerror|failed to fetch|fetch failed|load failed|truncated|finish_reason.*length|response was cut off|临时失败|自动重试|请再试一次|稍后重试|服务繁忙/i.test(message);
}

export function getAIUserErrorMessage(error: unknown, language: Language = 'zh'): string {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = extractAIErrorMessage(message) || message;

  if (/truncated|截断|finish_reason.*length/i.test(normalized)) {
    return language === 'en'
      ? 'AI output was cut off before valid JSON. Try again with a smaller or more focused screenshot.'
      : 'AI 输出被截断，未生成完整 JSON。请重试一次；如果仍失败，请换一张更小或更聚焦的截图。';
  }

  if (/empty response|返回为空/i.test(normalized)) {
    return language === 'en'
      ? 'AI returned an empty response. Please retry the analysis.'
      : 'AI 返回为空。请重新发起分析。';
  }

  if (/unknownerror|internal error|overloaded|temporarily|503|502|500/i.test(normalized)) {
    return language === 'en'
      ? 'AI service failed temporarily. Distill has retried the request; please try once more or upload a smaller, clearer image.'
      : 'AI 服务临时失败。系统已自动重试；请再试一次，或换一张更小、更清晰的图片。';
  }

  if (/network|networkerror|failed to fetch|fetch failed|load failed/i.test(normalized)) {
    return language === 'en'
      ? 'Network connection to the AI service failed. The request now uses the server route first; please retry once after refreshing the page.'
      : '连接 AI 服务的网络请求失败。系统现在会优先走服务器通道；请刷新页面后再试一次。';
  }

  if (/timeout|timed out|abort/i.test(normalized)) {
    return language === 'en'
      ? 'The analysis request timed out. Try a smaller image or retry when the network is stable.'
      : '分析请求超时。请换一张更小的图片，或在网络稳定后重试。';
  }

  if (/rate limit|too many/i.test(normalized)) {
    return language === 'en'
      ? 'Too many analysis requests. Please wait a few minutes and try again.'
      : '分析请求过于频繁。请等待几分钟后重试。';
  }

  if (/api key|authorization|unauthorized|forbidden|invalid api/i.test(normalized)) {
    return language === 'en'
      ? 'AI authorization failed. Refresh the page and try again.'
      : 'AI 授权失败。请刷新页面后重试。';
  }

  return normalized;
}

export class AIProviderError extends Error {
  status?: number;
  retryable: boolean;

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = 'AIProviderError';
    this.status = options.status;
    this.retryable = options.retryable ?? isRetryableAIError(message);
  }
}
