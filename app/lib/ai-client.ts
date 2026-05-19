/**
 * AI Client for APIMart (OpenAI-compatible API)
 * Gemini 2.5 Flash for vision → Claude Sonnet 4.6 for code generation
 */

const API_BASE_URL = 'https://api.apimart.ai/v1';
const API_KEY = process.env.APIMART_API_KEY;

interface VisionAnalysisResult {
  colorPalette: {
    primary: string[];
    secondary: string[];
    background: string[];
    accent: string[];
  };
  typography: {
    headings: string;
    body: string;
    characteristics: string[];
  };
  layout: {
    structure: string[];
    gridType: string;
    spacing: string;
    alignment: string;
  };
  visualStyle: {
    tags: string[];
    mood: string;
    aesthetic: string;
  };
  content: {
    headings: string[];
    bodyText: string[];
    buttons: string[];
  };
}

interface CodeGenerationResult {
  cssContent: string;
  markdownContent: string;
  promptContent: string;
}

export class AIClient {
  private headers: HeadersInit;

  constructor() {
    if (!API_KEY) {
      throw new Error('APIMART_API_KEY environment variable is not set');
    }
    this.headers = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Analyze image using Gemini 2.5 Flash
   */
  async analyzeImage(imageBase64: string): Promise<VisionAnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        stream: false,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this design image. Return ONLY valid JSON (no markdown, no explanation) with this exact structure:

{"colorPalette":{"primary":["#hex"],"secondary":["#hex"],"background":["#hex"],"accent":["#hex"]},"typography":{"headings":"font description","body":"font description","characteristics":["char1"]},"layout":{"structure":["section desc 1","section desc 2"],"gridType":"grid type","spacing":"spacing desc","alignment":"alignment desc"},"visualStyle":{"tags":["tag1","tag2","tag3"],"mood":"mood desc","aesthetic":"aesthetic desc"},"content":{"headings":["heading text"],"bodyText":["body text"],"buttons":["button text"]}}`
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vision API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return parseJSON(content);
  }

  /**
   * Generate CSS and Markdown using Claude Sonnet
   */
  async generateDesignCode(analysis: VisionAnalysisResult): Promise<CodeGenerationResult> {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        stream: false,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: `You are a design system expert. Based on this analysis, generate CSS variables, markdown docs, and a rebuild prompt.

Design Analysis:
${JSON.stringify(analysis, null, 2)}

IMPORTANT: Return ONLY valid JSON (no markdown fences, no explanation outside JSON) in this exact format:
{"cssContent":"CSS string with :root variables","markdownContent":"Markdown documentation string","promptContent":"Prompt string for recreating this design"}

Rules:
- cssContent: CSS custom properties only (no selectors besides :root), keep under 2000 chars
- markdownContent: Short design system docs, keep under 1500 chars  
- promptContent: Concise prompt for another LLM to recreate the page, keep under 2000 chars
- All values must be proper escaped JSON strings (use \\n for newlines)
- Do NOT truncate any value`
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Code generation API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return parseJSON(content);
  }

  /**
   * Full pipeline: vision → code gen
   */
  async extractStyle(imageBase64: string): Promise<{
    analysis: VisionAnalysisResult;
    generated: CodeGenerationResult;
  }> {
    const analysis = await this.analyzeImage(imageBase64);
    const generated = await this.generateDesignCode(analysis);
    return { analysis, generated };
  }
}

/**
 * Robust JSON parser for AI responses
 */
function parseJSON(text: string): any {
  if (!text) throw new Error('Empty response from AI');

  // Try direct parse
  try { return JSON.parse(text); } catch {}

  // Try extracting from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]); } catch {}
  }

  // Try finding balanced braces
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    const candidate = text.substring(braceStart, braceEnd + 1);
    try { return JSON.parse(candidate); } catch {}
  }

  throw new Error(`Failed to parse AI JSON response (length=${text.length}): ${text.substring(0, 300)}`);
}

export default AIClient;
