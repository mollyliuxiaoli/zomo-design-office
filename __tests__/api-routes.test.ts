import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getToken } from '@/app/api/token/route';
import { isValidTokenOrigin } from '@/app/lib/security/origin';

// --- Token route logic tests (pure logic, no Next.js dependency) ---
describe('Token route security logic', () => {
  function isValidOrigin(referer: string, host: string): boolean {
    return isValidTokenOrigin(referer, host);
  }

  it('allows valid localhost referer', () => {
    expect(isValidOrigin('http://localhost:3099/analyze', 'localhost:3099')).toBe(true);
  });

  it('allows valid production referer', () => {
    expect(isValidOrigin('https://zomo-design-office.vercel.app/', 'zomo-design-office.vercel.app')).toBe(true);
  });

  it('rejects evil.com referer', () => {
    expect(isValidOrigin('https://evil.com/steal', 'evil.com')).toBe(false);
  });

  it('rejects empty referer with invalid host', () => {
    expect(isValidOrigin('', 'random-host.com')).toBe(false);
  });

  it('allows empty referer with valid host', () => {
    expect(isValidOrigin('', 'localhost:3099')).toBe(true);
  });

  it('allows current local preview port 3010', () => {
    expect(isValidOrigin('http://localhost:3010/analyze', 'localhost:3010')).toBe(true);
  });

  it('allows subdomain of production host', () => {
    expect(isValidOrigin('https://staging.distill.style/', 'staging.distill.style')).toBe(true);
  });
});

describe('Token route integration', () => {
  const originalKey = process.env.APIMART_API_KEY;

  beforeEach(() => {
    process.env.APIMART_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.APIMART_API_KEY;
    else process.env.APIMART_API_KEY = originalKey;
  });

  it('allows localhost preview on any development port', async () => {
    const request = new NextRequest('http://localhost:3010/api/token', {
      headers: {
        host: 'localhost:3010',
        referer: 'http://localhost:3010/analyze',
      },
    });

    const response = await getToken(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ key: 'test-key' });
  });

  it('rejects malformed referers instead of throwing', async () => {
    const request = new NextRequest('http://localhost:3010/api/token', {
      headers: {
        host: 'localhost:3010',
        referer: '::::',
      },
    });

    const response = await getToken(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Invalid origin' });
  });
});

// --- Share route validation logic ---
describe('Share token validation logic', () => {
  const MAX_TOKEN_LENGTH = 8000;
  const MAX_DECOMPRESSED_SIZE = 50 * 1024;

  function validateToken(token: string): { valid: boolean; error?: string } {
    if (!token) return { valid: false, error: 'Missing' };
    if (token.length > MAX_TOKEN_LENGTH) return { valid: false, error: 'too large' };
    return { valid: true };
  }

  function validateDecompressed(data: string): { valid: boolean; error?: string } {
    if (data.length > MAX_DECOMPRESSED_SIZE) return { valid: false, error: 'too large' };
    return { valid: true };
  }

  function validateSpecShape(parsed: unknown): { valid: boolean; error?: string } {
    if (typeof parsed !== 'object' || parsed === null) return { valid: false, error: 'not object' };
    const rawSpec = (parsed as any).spec || parsed;
    if (typeof rawSpec !== 'object' || !rawSpec.styleName) return { valid: false, error: 'no styleName' };
    return { valid: true };
  }

  it('rejects missing token', () => {
    expect(validateToken('').valid).toBe(false);
  });

  it('rejects oversized token', () => {
    expect(validateToken('a'.repeat(9000)).valid).toBe(false);
  });

  it('accepts valid token', () => {
    expect(validateToken('abc123').valid).toBe(true);
  });

  it('rejects oversized decompressed data', () => {
    expect(validateDecompressed('x'.repeat(60000)).valid).toBe(false);
  });

  it('accepts reasonable decompressed data', () => {
    expect(validateDecompressed('{"spec":{}}').valid).toBe(true);
  });

  it('rejects non-object parsed data', () => {
    expect(validateSpecShape('string').valid).toBe(false);
    expect(validateSpecShape(null).valid).toBe(false);
  });

  it('rejects object without styleName', () => {
    expect(validateSpecShape({ spec: { colors: {} } }).valid).toBe(false);
  });

  it('accepts valid spec shape', () => {
    expect(validateSpecShape({ spec: { styleName: 'Test' } }).valid).toBe(true);
  });
});

// --- OG route validation logic ---
describe('OG parameter validation logic', () => {
  function isValidHex(color: string): boolean {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color);
  }

  function safeColor(color: string, fallback: string): string {
    return isValidHex(color) ? color : fallback;
  }

  function clampString(s: string, max: number): string {
    return s.length > max ? s.substring(0, max) : s;
  }

  it('validates hex colors correctly', () => {
    expect(isValidHex('#2563eb')).toBe(true);
    expect(isValidHex('#fff')).toBe(true);
    expect(isValidHex('#2563ebaa')).toBe(true);
    expect(isValidHex('2563eb')).toBe(false);
    expect(isValidHex('#gggggg')).toBe(false);
    expect(isValidHex('not-a-color')).toBe(false);
    expect(isValidHex('')).toBe(false);
  });

  it('falls back on invalid colors', () => {
    expect(safeColor('not-a-color', '#2563eb')).toBe('#2563eb');
    expect(safeColor('#ff0000', '#2563eb')).toBe('#ff0000');
  });

  it('clamps long strings', () => {
    expect(clampString('short', 10)).toBe('short');
    const long = 'A'.repeat(500);
    expect(clampString(long, 80).length).toBe(80);
  });
});

// --- API input validation logic ---
describe('API URL input validation', () => {
  function validateUrl(url: unknown): { valid: boolean; error?: string } {
    if (!url || typeof url !== 'string') return { valid: false, error: 'URL is required' };
    try {
      const u = new URL(url);
      if (!['http:', 'https:'].includes(u.protocol)) return { valid: false, error: 'Only HTTP/HTTPS' };
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  it('accepts valid HTTP URL', () => {
    expect(validateUrl('https://example.com').valid).toBe(true);
  });

  it('rejects missing URL', () => {
    expect(validateUrl(null).valid).toBe(false);
    expect(validateUrl(undefined).valid).toBe(false);
    expect(validateUrl('').valid).toBe(false);
  });

  it('rejects non-string URL', () => {
    expect(validateUrl(123).valid).toBe(false);
  });

  it('rejects invalid URL format', () => {
    expect(validateUrl('not-a-url').valid).toBe(false);
  });

  it('rejects non-HTTP protocols', () => {
    expect(validateUrl('ftp://example.com').valid).toBe(false);
    expect(validateUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateUrl('data:text/html,test').valid).toBe(false);
  });
});
