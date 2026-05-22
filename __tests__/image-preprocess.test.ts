import { describe, expect, it } from 'vitest';
import { fitImageDimensions, getImageCompressionPlan } from '@/app/lib/analyze/image-preprocess';

describe('image preprocessing', () => {
  it('downscales tall screenshots even when width is already small', () => {
    const result = fitImageDimensions(390, 4200, {
      maxWidth: 1200,
      maxHeight: 1800,
      maxPixels: 1_300_000,
    });

    expect(result.height).toBeLessThanOrEqual(1800);
    expect(result.width * result.height).toBeLessThanOrEqual(1_300_000);
    expect(result.resized).toBe(true);
  });

  it('keeps normal images unchanged when they are under every limit', () => {
    const result = fitImageDimensions(640, 420, {
      maxWidth: 1200,
      maxHeight: 1200,
      maxPixels: 1_300_000,
    });

    expect(result).toMatchObject({ width: 640, height: 420, resized: false, scale: 1 });
  });

  it('uses a stricter fallback variant after provider failures', () => {
    const [primary, fallback] = getImageCompressionPlan('screenshot');

    expect(primary.maxPixels).toBeGreaterThan(fallback.maxPixels);
    expect(primary.maxHeight).toBeGreaterThan(fallback.maxHeight);
    expect(primary.quality).toBeGreaterThan(fallback.quality);
  });
});