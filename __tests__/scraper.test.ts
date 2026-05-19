import { describe, it, expect } from 'vitest';
import { scrapeUrl } from '@/app/lib/scraper';

describe('scraper SSRF protection', () => {
  it('blocks localhost', async () => {
    await expect(scrapeUrl('http://localhost/')).rejects.toThrow('internal');
  });

  it('blocks 127.0.0.1', async () => {
    await expect(scrapeUrl('http://127.0.0.1/')).rejects.toThrow('internal');
  });

  it('blocks 192.168.x.x', async () => {
    await expect(scrapeUrl('http://192.168.1.1/')).rejects.toThrow('internal');
  });

  it('blocks 10.x.x.x', async () => {
    await expect(scrapeUrl('http://10.0.0.1/')).rejects.toThrow('internal');
  });

  it('blocks 172.16.x.x', async () => {
    await expect(scrapeUrl('http://172.16.0.1/')).rejects.toThrow('internal');
  });

  it('blocks 169.254.169.254 (cloud metadata)', async () => {
    await expect(scrapeUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow('internal');
  });

  it('blocks .local TLD', async () => {
    await expect(scrapeUrl('http://myserver.local/api')).rejects.toThrow('internal');
  });

  it('blocks .internal TLD', async () => {
    await expect(scrapeUrl('http://service.internal/data')).rejects.toThrow('internal');
  });

  it('blocks 0.0.0.0', async () => {
    await expect(scrapeUrl('http://0.0.0.0/')).rejects.toThrow('internal');
  });

  it('rejects non-HTTP protocols', async () => {
    await expect(scrapeUrl('ftp://example.com/')).rejects.toThrow();
  });

  it('blocks CGNAT range 100.64.x.x', async () => {
    await expect(scrapeUrl('http://100.64.0.1/')).rejects.toThrow('internal');
  });
});

describe('scraper URL validation', () => {
  it('rejects empty URL', () => {
    expect(() => new URL('')).toThrow();
  });

  it('rejects javascript: protocol', async () => {
    await expect(scrapeUrl('javascript:alert(1)')).rejects.toThrow();
  });

  it('rejects data: protocol', async () => {
    await expect(scrapeUrl('data:text/html,<h1>test</h1>')).rejects.toThrow();
  });
});
