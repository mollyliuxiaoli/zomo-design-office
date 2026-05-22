import type { AnalyzeMode } from '@/app/lib/analyze/modes';

export type ImageCompressionSettings = {
  maxWidth: number;
  maxHeight: number;
  maxPixels: number;
  quality: number;
};

export type FittedImageDimensions = {
  width: number;
  height: number;
  scale: number;
  resized: boolean;
};

function positiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function fitImageDimensions(
  width: number,
  height: number,
  limits: Pick<ImageCompressionSettings, 'maxWidth' | 'maxHeight' | 'maxPixels'>
): FittedImageDimensions {
  const safeWidth = Math.max(1, Math.round(positiveNumber(width, 1)));
  const safeHeight = Math.max(1, Math.round(positiveNumber(height, 1)));
  const maxWidth = positiveNumber(limits.maxWidth, safeWidth);
  const maxHeight = positiveNumber(limits.maxHeight, safeHeight);
  const maxPixels = positiveNumber(limits.maxPixels, safeWidth * safeHeight);

  const widthScale = maxWidth / safeWidth;
  const heightScale = maxHeight / safeHeight;
  const pixelScale = Math.sqrt(maxPixels / (safeWidth * safeHeight));
  const scale = Math.min(1, widthScale, heightScale, pixelScale);
  const fittedWidth = Math.max(1, Math.round(safeWidth * scale));
  const fittedHeight = Math.max(1, Math.round(safeHeight * scale));

  return {
    width: fittedWidth,
    height: fittedHeight,
    scale,
    resized: scale < 0.999 || fittedWidth !== safeWidth || fittedHeight !== safeHeight,
  };
}

const IMAGE_COMPRESSION_PLAN: ImageCompressionSettings[] = [
  { maxWidth: 1200, maxHeight: 1200, maxPixels: 1_000_000, quality: 0.82 },
  { maxWidth: 800, maxHeight: 900, maxPixels: 560_000, quality: 0.72 },
];

const SCREENSHOT_COMPRESSION_PLAN: ImageCompressionSettings[] = [
  { maxWidth: 1200, maxHeight: 1800, maxPixels: 1_300_000, quality: 0.82 },
  { maxWidth: 800, maxHeight: 1200, maxPixels: 720_000, quality: 0.72 },
];

export function getImageCompressionPlan(mode: Exclude<AnalyzeMode, 'url'>): ImageCompressionSettings[] {
  return mode === 'screenshot' ? SCREENSHOT_COMPRESSION_PLAN : IMAGE_COMPRESSION_PLAN;
}
