/**
 * Shared web scraper — used by both /api/scrape route and /api/reverse-page
 * Uses lightweight fetch + regex HTML parsing for edge runtime compatibility
 */

export interface ScrapedData {
  url: string;
  title: string;
  description: string;
  headings: string[];
  sections: Array<{
    type: string;
    content: string[];
    tag: string;
  }>;
  colors: string[];
  fonts: string[];
  buttons: string[];
  images: string[];
}

const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB
const MAX_REDIRECTS = 4;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const BLOCKED_HOST_PREFIXES = [
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  '10.', '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
  '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
  '192.168.',
  '169.254.',
  '100.64.', '100.65.', '100.66.', '100.67.', '100.68.', '100.69.',
  '100.70.', '100.71.', '100.72.', '100.73.', '100.74.', '100.75.',
  '100.76.', '100.77.', '100.78.', '100.79.', '100.80.', '100.81.',
  '100.82.', '100.83.', '100.84.', '100.85.', '100.86.', '100.87.',
  '100.88.', '100.89.', '100.90.', '100.91.', '100.92.', '100.93.',
  '100.94.', '100.95.', '100.96.', '100.97.', '100.98.', '100.99.',
  '100.100.', '100.101.', '100.102.', '100.103.', '100.104.', '100.105.',
  '100.106.', '100.107.', '100.108.', '100.109.', '100.110.', '100.111.',
  '100.112.', '100.113.', '100.114.', '100.115.', '100.116.', '100.117.',
  '100.118.', '100.119.', '100.120.', '100.121.', '100.122.', '100.123.',
  '100.124.', '100.125.', '100.126.', '100.127.',
];

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, '');
}

function isBlockedIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(part => Number(part));
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function ipv4FromMappedIpv6(hostname: string): string | null {
  if (!hostname.startsWith('::ffff:')) return null;
  const mapped = hostname.slice('::ffff:'.length);
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(mapped)) return mapped;

  const [high, low] = mapped.split(':');
  if (!high || !low) return null;
  const highValue = Number.parseInt(high, 16);
  const lowValue = Number.parseInt(low, 16);
  if (!Number.isFinite(highValue) || !Number.isFinite(lowValue)) return null;

  return [
    (highValue >> 8) & 255,
    highValue & 255,
    (lowValue >> 8) & 255,
    lowValue & 255,
  ].join('.');
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  const mappedIpv4 = ipv4FromMappedIpv6(normalized);

  if (mappedIpv4 && isBlockedIpv4(mappedIpv4)) return true;
  if (isBlockedIpv4(normalized)) return true;

  return (
    BLOCKED_HOST_PREFIXES.some(h => normalized === h || normalized.startsWith(h)) ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.localhost') ||
    normalized === '::1' ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  );
}

function assertSafeHttpUrl(url: string): URL {
  const validUrl = new URL(url);

  if (!['http:', 'https:'].includes(validUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are supported');
  }

  const hostname = normalizeHostname(validUrl.hostname);
  if (isBlockedHostname(hostname)) {
    throw new Error('Cannot scrape internal/private URLs');
  }

  if (/^0x[0-9a-f]+$/i.test(hostname) || /^\d+$/.test(hostname)) {
    throw new Error('Cannot scrape encoded IP addresses');
  }

  return validUrl;
}

/**
 * Scrape a URL and return structured data
 */
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  let currentUrl = assertSafeHttpUrl(url).href;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DistillBot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'manual',
    });

    if (REDIRECT_STATUSES.includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`Redirect missing location header: ${response.status}`);
      try {
        currentUrl = assertSafeHttpUrl(new URL(location, currentUrl).href).href;
      } catch (error) {
        if (error instanceof Error && error.message.includes('internal/private')) {
          throw new Error('Redirect target is a private/internal URL');
        }
        throw error;
      }
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      throw new Error(`Unsupported content type: ${contentType}. Only HTML is supported.`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.length;
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const decoder = new TextDecoder();
    const html = chunks.map(c => decoder.decode(c, { stream: true })).join('') + decoder.decode();
    const parsed = parseHTML(html);

    return {
      url: currentUrl,
      ...parsed,
    };
  }

  throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
}

/**
 * Parse HTML and extract structured data
 */
function parseHTML(html: string): Omit<ScrapedData, 'url'> {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1] : '';

  // Extract headings
  const headings: string[] = [];
  const headingRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    // Strip inner HTML tags
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text && text.length < 200) {
      headings.push(text);
    }
  }

  // Extract sections
  const sections: Array<{ type: string; content: string[]; tag: string }> = [];
  const sectionRegex = /<(section|article|main|header|footer)[^>]*>([\s\S]*?)<\/\1>/gi;
  let sectionMatch;
  let sectionCount = 0;

  while ((sectionMatch = sectionRegex.exec(html)) !== null && sectionCount < 10) {
    const tag = sectionMatch[1];
    const content = sectionMatch[2];

    const textContent = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (textContent.length > 20 && textContent.length < 1000) {
      const headingMatch = content.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
      const heading = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      sections.push({
        type: heading ? 'heading-section' : 'content-section',
        content: heading ? [heading, textContent.substring(0, 300)] : [textContent.substring(0, 300)],
        tag,
      });
      sectionCount++;
    }
  }

  // Extract colors
  const colorSet = new Set<string>();
  const colorRegex = /#[0-9a-fA-F]{3,8}/g;
  let colorMatch;
  while ((colorMatch = colorRegex.exec(html)) !== null) {
    colorSet.add(colorMatch[0]);
    if (colorSet.size > 20) break;
  }

  // Extract fonts
  const fontSet = new Set<string>();
  const fontRegex = /font-family:\s*['"]?([^'";,\n}]+)/gi;
  let fontMatch;
  while ((fontMatch = fontRegex.exec(html)) !== null) {
    const font = fontMatch[1].trim();
    if (font && !font.startsWith('inherit') && !font.startsWith('initial')) {
      fontSet.add(font);
      if (fontSet.size > 10) break;
    }
  }

  // Extract buttons
  const buttons: string[] = [];
  const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>|<a[^>]*class=["'][^"']*btn[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let buttonMatch;
  while ((buttonMatch = buttonRegex.exec(html)) !== null) {
    const text = (buttonMatch[1] || buttonMatch[2] || '').replace(/<[^>]+>/g, '').trim();
    if (text && text.length < 100) {
      buttons.push(text);
    }
  }

  // Extract image alt text
  const images: string[] = [];
  const imgRegex = /<img[^>]*alt=["']([^"']+)["'][^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const alt = imgMatch[1].trim();
    if (alt && alt.length < 200) {
      images.push(alt);
    }
  }

  return {
    title,
    description,
    headings: headings.slice(0, 10),
    sections: sections.slice(0, 8),
    colors: Array.from(colorSet).slice(0, 15),
    fonts: Array.from(fontSet).slice(0, 5),
    buttons: buttons.slice(0, 10),
    images: images.slice(0, 5),
  };
}
