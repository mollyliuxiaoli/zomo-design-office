'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import { useLanguage } from '../components/LanguageProvider';
import { styleRepo } from '../lib/storage/repo';
import type { LibraryRecord } from '../lib/storage/db';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from '../lib/ai-client';
import { getStyleAnalysisPrompt } from '../lib/style-analysis-prompt';
import {
  AIProviderError,
  extractAIErrorMessage,
  getAIUserErrorMessage,
  isRetryableAIError,
} from '../lib/ai-errors';
import {
  ANALYZE_MODE_ORDER,
  canAnalyzeMode,
  createInitialAnalyzeStates,
  getAnalyzeCopy,
  type AnalyzeMode,
  type AnalyzeModeState,
} from '../lib/analyze/modes';
import { fitImageDimensions, getImageCompressionPlan, type ImageCompressionSettings } from '../lib/analyze/image-preprocess';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const VISION_TIMEOUT_MS = 90_000;
const TOKEN_TIMEOUT_MS = 15_000;

/** Compress image by width, height and pixel budget while maintaining aspect ratio. */
async function compressImage(dataUrl: string, settings: ImageCompressionSettings): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const fitted = fitImageDimensions(img.width, img.height, settings);
      const canvas = document.createElement('canvas');
      canvas.width = fitted.width;
      canvas.height = fitted.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', settings.quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = VISION_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AIProviderError('request timeout', { retryable: true });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function parseJSONFromResponse(text: string): Record<string, unknown> {
  if (!text) throw new Error('AI 返回为空');

  try { return JSON.parse(text); } catch {}

  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]); } catch {}
  }

  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.substring(braceStart, braceEnd + 1)); } catch {}
  }

  throw new Error(`无法解析 AI 响应 (长度=${text.length})`);
}

async function parseVisionResponse(response: Response): Promise<Partial<StyleSpecV1Input>> {
  const bodyText = await response.text();

  if (!response.ok) {
    const providerMessage = extractAIErrorMessage(bodyText) || `HTTP ${response.status}`;
    throw new AIProviderError(providerMessage, {
      status: response.status,
      retryable: response.status >= 500 || isRetryableAIError(providerMessage),
    });
  }

  let data: any;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new AIProviderError(extractAIErrorMessage(bodyText) || bodyText || 'Invalid AI response');
  }

  if (data?.error) {
    throw new AIProviderError(extractAIErrorMessage(bodyText));
  }

  const choice = data.choices?.[0];
  const content = choice?.message?.content || '';

  try {
    return parseJSONFromResponse(content);
  } catch (parseError) {
    if (choice?.finish_reason === 'length') {
      throw new AIProviderError('AI response truncated (finish_reason=length)', { retryable: true });
    }
    throw parseError;
  }
}

async function retry<T>(operation: () => Promise<T>, shouldRetry: (error: unknown) => boolean, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1 || !shouldRetry(error)) break;
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }
  }
  throw lastError;
}

/** Call APIMart vision API directly from browser. */
async function callVisionAPI(imagePayload: string, apiKey: string, mode: Exclude<AnalyzeMode, 'url'>): Promise<Partial<StyleSpecV1Input>> {
  return retry(async () => {
    const response = await fetchWithTimeout('https://api.apimart.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        stream: false,
        max_tokens: 4096,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: getStyleAnalysisPrompt(mode) },
              { type: 'image_url', image_url: { url: imagePayload } },
            ],
          },
        ],
      }),
    });

    return parseVisionResponse(response);
  }, isRetryableAIError, 2);
}

async function callServerVisionAPI(imagePayload: string, mode: Exclude<AnalyzeMode, 'url'>, styleName: string): Promise<Partial<StyleSpecV1Input>> {
  const response = await fetchWithTimeout('/api/analyze-style', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: imagePayload, mode, styleName }),
  }, VISION_TIMEOUT_MS);

  const bodyText = await response.text();
  let data: any = {};
  try { data = JSON.parse(bodyText); } catch {}

  if (!response.ok) {
    const message = data?.details || data?.error || extractAIErrorMessage(bodyText) || `HTTP ${response.status}`;
    throw new AIProviderError(message, {
      status: response.status,
      retryable: Boolean(data?.retryable) || response.status >= 500 || isRetryableAIError(message),
    });
  }

  return data.spec || data.partialSpec || data;
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function validateRemoteImageUrl(value: string, unsupportedMessage: string): string {
  const remoteImageUrl = value.trim();
  const parsedImageUrl = new URL(remoteImageUrl);
  if (!['http:', 'https:'].includes(parsedImageUrl.protocol)) {
    throw new Error(unsupportedMessage);
  }
  return remoteImageUrl;
}

export default function AnalyzePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = getAnalyzeCopy(language);
  const [mode, setMode] = useState<AnalyzeMode>('image');
  const [modeStates, setModeStates] = useState(createInitialAnalyzeStates);
  const [runningMode, setRunningMode] = useState<AnalyzeMode | null>(null);

  const currentState = modeStates[mode];
  const modeDetail = copy.modes[mode];
  const runningModeLabel = runningMode ? copy.modes[runningMode].label : '';

  const updateModeState = (targetMode: AnalyzeMode, update: Partial<AnalyzeModeState> | ((state: AnalyzeModeState) => AnalyzeModeState)) => {
    setModeStates((prev) => ({
      ...prev,
      [targetMode]: typeof update === 'function' ? update(prev[targetMode]) : { ...prev[targetMode], ...update },
    }));
  };

  const updateCurrentState = (update: Partial<AnalyzeModeState> | ((state: AnalyzeModeState) => AnalyzeModeState)) => {
    updateModeState(mode, update);
  };

  const canAnalyze = useMemo(() => canAnalyzeMode(mode, currentState, runningMode), [currentState, mode, runningMode]);

  const handleModeChange = (nextMode: AnalyzeMode) => {
    setMode(nextMode);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      updateCurrentState({ file: null, preview: '', imageUrl: '', error: copy.common.fileTypeError, status: 'error' });
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      updateCurrentState({ file: null, preview: '', imageUrl: '', error: copy.common.fileSizeError, status: 'error' });
      return;
    }

    const targetMode = mode;
    updateModeState(targetMode, { error: '', imageUrl: '', file: selectedFile, status: 'idle' });
    const reader = new FileReader();
    reader.onloadend = () => {
      updateModeState(targetMode, { preview: typeof reader.result === 'string' ? reader.result : '' });
    };
    reader.readAsDataURL(selectedFile);
  };

  const clearSelectedImage = () => {
    updateCurrentState({ file: null, preview: '', imageUrl: '', error: '', progress: '', status: 'idle' });
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    const trimmedValue = nextValue.trim();
    updateCurrentState((state) => ({
      ...state,
      imageUrl: nextValue,
      preview: trimmedValue || (state.file ? state.preview : ''),
      file: trimmedValue ? null : state.file,
      error: '',
      status: 'idle',
    }));
  };

  const handleTargetUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCurrentState({ targetUrl: e.target.value, error: '', status: 'idle' });
  };

  const setRunProgress = (targetMode: AnalyzeMode, progress: string) => {
    updateModeState(targetMode, { progress, status: 'running' });
  };

  const handleAnalyze = async () => {
    const runMode = mode;
    const runState = modeStates[runMode];

    if (runMode === 'url' && !runState.targetUrl.trim()) {
      updateModeState(runMode, { error: copy.common.urlRequired, status: 'error' });
      return;
    }
    if ((runMode === 'image' || runMode === 'screenshot') && !runState.preview && !runState.imageUrl.trim()) {
      updateModeState(runMode, { error: copy.common.imageRequired, status: 'error' });
      return;
    }
    if (runningMode) return;

    setRunningMode(runMode);
    updateModeState(runMode, { error: '', progress: copy.common.prepare, status: 'running' });

    try {
      let savedRecord: LibraryRecord;

      if (runMode === 'url') {
        setRunProgress(runMode, copy.common.webAnalyzing);
        const response = await fetchWithTimeout('/api/reverse-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: runState.targetUrl.trim() }),
        }, VISION_TIMEOUT_MS);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: language === 'en' ? 'Analysis failed' : '分析失败' }));
          throw new Error(errorData.details || errorData.error || (language === 'en' ? 'Analysis failed' : '分析失败'));
        }

        const result = await response.json();
        if (result.record) {
          savedRecord = await styleRepo.save(result.record);
        } else {
          throw new Error(language === 'en' ? 'Server returned an invalid result' : '服务器返回数据格式异常');
        }
      } else {
        let imagePayload = runState.preview;
        let originalDataUrl = '';

        if (runState.imageUrl.trim() && !imagePayload?.startsWith('data:')) {
          imagePayload = validateRemoteImageUrl(runState.imageUrl, copy.common.unsupportedImageUrl);
        }

        if (imagePayload?.startsWith('data:image/')) {
          originalDataUrl = imagePayload;
          const [primarySettings] = getImageCompressionPlan(runMode);
          setRunProgress(runMode, copy.common.compress);
          imagePayload = await compressImage(originalDataUrl, primarySettings);
        }

        if (!imagePayload) throw new Error(copy.common.imageProcessingFailed);

        setRunProgress(runMode, copy.common.aiAnalyzing);
        const tokenRes = await fetchWithTimeout('/api/token', {}, TOKEN_TIMEOUT_MS);
        if (!tokenRes.ok) throw new Error(copy.common.tokenError);
        const { key } = await tokenRes.json();

        const runVisionPipeline = async (payload: string): Promise<Partial<StyleSpecV1Input>> => {
          try {
            return await callVisionAPI(payload, key, runMode);
          } catch (directError) {
            if (!isRetryableAIError(directError)) throw directError;
            setRunProgress(runMode, copy.common.serverFallback);
            return retry(
              () => callServerVisionAPI(payload, runMode, runState.styleName),
              isRetryableAIError,
              2
            );
          }
        };

        let rawSpec: Partial<StyleSpecV1Input>;
        try {
          rawSpec = await runVisionPipeline(imagePayload);
        } catch (firstError) {
          if (!originalDataUrl || !isRetryableAIError(firstError)) throw firstError;

          const [, compactSettings] = getImageCompressionPlan(runMode);
          setRunProgress(runMode, copy.common.compactRetry);
          const compactPayload = await compressImage(originalDataUrl, compactSettings);
          if (compactPayload === imagePayload) throw firstError;

          imagePayload = compactPayload;
          rawSpec = await runVisionPipeline(imagePayload);
        }

        if (typeof rawSpec !== 'object' || rawSpec === null || Array.isArray(rawSpec)) {
          throw new Error(copy.common.invalidAIShape);
        }

        const sourceType = runMode === 'screenshot' ? 'screenshot' : 'image';
        const fullSpec = withDerived(normalizeSpec({
          ...(rawSpec as StyleSpecV1Input),
          source: {
            ...(rawSpec as StyleSpecV1Input).source,
            type: sourceType,
            thumbnailRef: imagePayload.startsWith('data:') ? imagePayload : undefined,
            originalUrl: !imagePayload.startsWith('data:') ? imagePayload : undefined,
          },
        }));
        const id = fullSpec.styleId || Date.now().toString();
        const createdAt = new Date().toISOString();

        const record: LibraryRecord = {
          id,
          spec: fullSpec,
          source: {
            type: 'user',
            label: runState.file?.name || runState.imageUrl || modeDetail.label,
          },
          title: runState.styleName || fullSpec.styleName || (language === 'en' ? 'Analyzed Style' : '分析结果'),
          thumbnailUrl: runState.preview || '',
          createdAt,
          updatedAt: createdAt,
          visibility: 'private',
        };

        setRunProgress(runMode, copy.common.save);
        savedRecord = await styleRepo.save(record);
      }

      updateModeState(runMode, { status: 'success', progress: '', error: '' });
      router.push(`/style/${savedRecord.id}`);
    } catch (err) {
      const message = runMode === 'image' || runMode === 'screenshot'
        ? getAIUserErrorMessage(err, language)
        : err instanceof Error ? err.message : (language === 'en' ? 'Analysis failed. Please try again' : '分析失败，请重试');
      updateModeState(runMode, { error: message, status: 'error', progress: '' });
      console.error(err);
    } finally {
      setRunningMode(null);
    }
  };

  const buttonText = runningMode && runningMode !== mode
    ? copy.common.waitingForOtherMode(runningModeLabel)
    : currentState.status === 'running'
      ? copy.common.analyzing
      : canAnalyze
        ? modeDetail.cta
        : modeDetail.emptyCta;

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-950">
      <Navigation />

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-700">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-xl break-words text-3xl font-black leading-tight tracking-tight text-zinc-950 sm:text-5xl sm:[word-break:keep-all]">
            {copy.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 sm:mt-5 sm:text-lg sm:leading-8">
            {copy.heroDescription}
          </p>

          <div className="mt-8 hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm lg:block">
            <h2 className="font-bold text-zinc-950">{copy.outputTitle}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {copy.outputHints.map((item) => (
                <div key={item} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                    <span className="font-semibold text-zinc-900">{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm lg:block">
            <h2 className="font-bold text-zinc-950">{copy.beforeTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
              {copy.beforeBullets.map((bullet) => <li key={bullet}>· {bullet}</li>)}
            </ul>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-950/5 sm:p-6 lg:p-8">
          <div className="mb-7">
            <div role="tablist" aria-label={copy.tablistLabel} className="grid grid-cols-3 gap-2 rounded-2xl bg-zinc-100 p-1">
              {ANALYZE_MODE_ORDER.map((key) => {
                const modeState = modeStates[key];
                const active = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleModeChange(key)}
                    className={`relative rounded-xl px-3 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 ${
                      active
                        ? 'bg-zinc-950 text-white shadow-sm'
                        : 'text-zinc-600 hover:bg-white hover:text-zinc-950'
                    }`}
                  >
                    {copy.modes[key].label}
                    {modeState.status === 'running' && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" aria-label={copy.common.statusRunning} />
                    )}
                    {modeState.status === 'error' && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" aria-label={copy.common.statusError} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{modeDetail.primaryInputLabel}</p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-950">{modeDetail.title}</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">{modeDetail.accepts}</span>
              </div>
              <p className="mt-3 leading-7 text-zinc-600">{modeDetail.description}</p>
              <p className="mt-3 text-sm font-medium text-zinc-500">{modeDetail.helper}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {modeDetail.output.map((item) => (
                  <div key={item} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">{item}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="style-name" className="block text-sm font-semibold text-zinc-800">
                {copy.common.styleName} <span className="font-normal text-zinc-500">{copy.common.optional}</span>
              </label>
              <input
                id="style-name"
                type="text"
                value={currentState.styleName}
                onChange={(e) => updateCurrentState({ styleName: e.target.value })}
                placeholder={copy.common.stylePlaceholder}
                className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
              />
            </div>

            {(mode === 'image' || mode === 'screenshot') && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{modeDetail.primaryInputLabel}</p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">{modeDetail.job}</p>
                  </div>
                  <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-500 ring-1 ring-zinc-200">{modeDetail.accepts}</span>
                </div>

                <input
                  key={mode}
                  id={`image-file-${mode}`}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                <label
                  htmlFor={`image-file-${mode}`}
                  className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-left transition hover:border-zinc-950 hover:bg-white focus-within:border-zinc-950"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm ring-1 ring-zinc-200">⌁</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-zinc-950">{modeDetail.uploadHint}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{language === 'en' ? 'Click to choose a file, then preview and removal stay here.' : '点击选择文件；选中后预览和移除操作会在这里集中显示。'}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white">{modeDetail.uploadLabel}</span>
                </label>

                <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <label htmlFor="image-url" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {copy.common.orPasteImageUrl}
                  </label>
                  <input
                    id="image-url"
                    type="url"
                    value={currentState.imageUrl}
                    onChange={handleImageUrlChange}
                    placeholder={modeDetail.placeholder}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
                  />
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{modeDetail.urlHelper}</p>
                </div>

                {currentState.preview && (
                  <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{copy.common.imagePreview}</div>
                        <div className="mt-1 truncate text-sm font-semibold text-zinc-900">
                          {currentState.file?.name || currentState.imageUrl || modeDetail.uploadLabel}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {currentState.file ? `${formatFileSize(currentState.file.size)} · ${copy.common.localFileSelected}` : modeDetail.urlLabel}
                        </div>
                      </div>
                      <button type="button" onClick={clearSelectedImage} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950">
                        {copy.common.remove}
                      </button>
                    </div>
                    <div className="border-t border-zinc-200 bg-zinc-50 p-3">
                      <img
                        src={currentState.preview}
                        alt={copy.common.imagePreview}
                        className="mx-auto max-h-[52vh] max-w-full rounded-2xl object-contain sm:max-h-[560px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'url' && (
              <div>
                <label htmlFor="target-url" className="block text-sm font-semibold text-zinc-800">
                  {modeDetail.primaryInputLabel}
                </label>
                <input
                  id="target-url"
                  type="url"
                  value={currentState.targetUrl}
                  onChange={handleTargetUrlChange}
                  placeholder={modeDetail.placeholder}
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
                />
                <p className="mt-2 text-sm leading-6 text-zinc-500">{modeDetail.helper}</p>
              </div>
            )}

            {runningMode && runningMode !== mode && (
              <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                {copy.common.otherModeRunning(runningModeLabel)}
              </div>
            )}

            {currentState.error && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {currentState.error}
              </div>
            )}

            {currentState.progress && (
              <div role="status" className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-medium text-zinc-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-200 to-transparent animate-shimmer" />
                <span className="relative z-10">{currentState.progress}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-6 py-4 text-base font-bold text-white shadow-lg shadow-zinc-950/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none disabled:hover:translate-y-0 active:scale-[0.98]"
            >
              {buttonText}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
