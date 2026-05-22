import { describe, it, expect, afterEach, vi } from 'vitest';
import { scrapeUrl } from '@/app/lib/scraper';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scraper SSRF protection', () => {
  it('blocks localhost', async () => {
    await expect(scrapeUrl('http://localhost/')).rejects.toThrow('internal');
  });

  it('blocks 127.0.0.1', async () => {
    await expect(scrapeUrl('http://127.0.0.1/')).rejects.toThrow('internal');
  });

  it('blocks the full 127.0.0.0/8 loopback range', async () => {
    await expect(scrapeUrl('http://127.0.1.1/')).rejects.toThrow('internal');
  });

  it('blocks private and loopback IPv6 literals', async () => {
    for (const url of ['http://[::1]/', 'http://[fd00::1]/', 'http://[fe80::1]/']) {
      await expect(scrapeUrl(url)).rejects.toThrow('internal');
    }
  });

  it('blocks IPv4-mapped loopback IPv6 literals', async () => {
    await expect(scrapeUrl('http://[::ffff:127.0.0.1]/')).rejects.toThrow('internal');
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

describe('scraper redirects', () => {
  it('follows safe HTTP redirects and parses the final page', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 301,
        headers: { location: 'https://example.com/' },
      }))
      .mockResolvedValueOnce(new Response('<html><head><title>Final Page</title></head><body><h1>Hero</h1></body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await scrapeUrl('http://example.com');

    expect(data.url).toBe('https://example.com/');
    expect(data.title).toBe('Final Page');
    expect(data.headings).toEqual(['Hero']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('blocks redirects to private/internal URLs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'http://127.0.0.1/admin' },
    })));

    await expect(scrapeUrl('https://example.com')).rejects.toThrow('private/internal');
  });
});
