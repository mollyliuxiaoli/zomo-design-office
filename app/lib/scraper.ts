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

/**
 * Scrape a URL and return structured data
 */
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  // Validate URL format
  const validUrl = new URL(url);

  if (!['http:', 'https:'].includes(validUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are supported');
  }

  // SSRF protection: block private/internal hosts
  const hostname = validUrl.hostname.toLowerCase();
  const blockedHosts = [
    'localhost', '127.0.0.1', '0.0.0.0', '::1',
    '10.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
    '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
    '192.168.',
  ];
  if (blockedHosts.some(h => hostname === h || hostname.startsWith(h))) {
    throw new Error('Cannot scrape internal/private URLs');
  }

  // Fetch the webpage
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ZomoDesignBot/1.0)',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch webpage: ${response.status}`);
  }

  const html = await response.text();
  const parsed = parseHTML(html);

  return {
    url,
    ...parsed,
  };
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
