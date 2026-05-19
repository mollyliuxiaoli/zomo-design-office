import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * API Route: Scrape Webpage
 * Accepts a URL and returns structured data extracted from the webpage
 * Uses lightweight approach: fetch + HTML parsing (not puppeteer)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS protocols are supported' },
        { status: 400 }
      );
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZomoDesignBot/1.0)',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch webpage: ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Parse HTML (basic parsing without cheerio for edge compatibility)
    const parsedData = parseHTML(html);

    return NextResponse.json({
      url,
      title: parsedData.title,
      sections: parsedData.sections,
      colors: parsedData.colors,
      fonts: parsedData.fonts,
      rawHtml: html.substring(0, 50000), // Limit size for edge runtime
    });
  } catch (error) {
    console.error('Error in scrape API route:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to scrape webpage',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Parse HTML and extract structured data
 * Uses regex-based parsing for edge runtime compatibility
 */
function parseHTML(html: string) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1] : '';

  // Extract headings
  const headings: string[] = [];
  const headingRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[1].trim();
    if (text && text.length < 200) {
      headings.push(text);
    }
  }

  // Extract sections (basic detection of div, section, article tags with content)
  const sections: Array<{
    type: string;
    content: string[];
    tag: string;
  }> = [];

  // Find common section containers
  const sectionRegex = /<(section|article|div|main|header|footer)[^>]*>([\s\S]*?)<\/\1>/gi;
  let sectionMatch;
  let sectionCount = 0;

  while ((sectionMatch = sectionRegex.exec(html)) !== null && sectionCount < 10) {
    const tag = sectionMatch[1];
    const content = sectionMatch[2];

    // Extract text content from this section
    const textContent = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (textContent.length > 20 && textContent.length < 500) {
      // Extract heading if present
      const headingMatch = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
      const heading = headingMatch ? headingMatch[1].trim() : '';

      sections.push({
        type: heading ? 'heading-section' : 'content-section',
        content: heading ? [heading, textContent.substring(0, 200)] : [textContent.substring(0, 200)],
        tag,
      });
      sectionCount++;
    }
  }

  // Extract colors from inline styles
  const colors: string[] = [];
  const colorRegex = /#[0-9a-fA-F]{3,8}/g;
  let colorMatch;
  const colorSet = new Set<string>();

  while ((colorMatch = colorRegex.exec(html)) !== null) {
    colorSet.add(colorMatch[0]);
    if (colorSet.size > 20) break; // Limit colors
  }

  colors.push(...Array.from(colorSet));

  // Extract fonts from @font-face and font-family
  const fonts: string[] = [];
  const fontFaceRegex = /font-family:\s*['"]([^'"]+)['"]/gi;
  let fontMatch;
  const fontSet = new Set<string>();

  while ((fontMatch = fontFaceRegex.exec(html)) !== null) {
    fontSet.add(fontMatch[1]);
    if (fontSet.size > 10) break; // Limit fonts
  }

  fonts.push(...Array.from(fontSet));

  // Extract button text
  const buttons: string[] = [];
  const buttonRegex = /<button[^>]*>([^<]+)<\/button>|<a[^>]*class=["'][^"']*button[^"']*["'][^>]*>([^<]+)<\/a>/gi;
  let buttonMatch;

  while ((buttonMatch = buttonRegex.exec(html)) !== null) {
    const text = (buttonMatch[1] || buttonMatch[2] || '').trim();
    if (text && text.length < 100) {
      buttons.push(text);
    }
  }

  // Extract image alt text for context
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
    colors: colors.slice(0, 15),
    fonts: fonts.slice(0, 5),
    buttons: buttons.slice(0, 10),
    images: images.slice(0, 5),
  };
}