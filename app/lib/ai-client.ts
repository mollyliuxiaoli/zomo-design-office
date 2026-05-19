/**
 * AI Client for APIMart (OpenAI-compatible API)
 * Supports Gemini 2.5 Flash for vision and Claude Sonnet 4.6 for code generation
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
   * Analyze image using Gemini 2.5 Flash for vision analysis
   */
  async analyzeImage(imageBase64: string): Promise<VisionAnalysisResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this design image and extract the following information in JSON format:

{
  "colorPalette": {
    "primary": ["#hex1", "#hex2"],
    "secondary": ["#hex1", "#hex2"],
    "background": ["#hex1", "#hex2"],
    "accent": ["#hex1", "#hex2"]
  },
  "typography": {
    "headings": "font description (e.g., 'Bold sans-serif, 48px')",
    "body": "font description (e.g., 'Regular sans-serif, 16px')",
    "characteristics": ["characteristic1", "characteristic2"]
  },
  "layout": {
    "structure": ["section1 description", "section2 description"],
    "gridType": "grid description (e.g., '12-column grid')",
    "spacing": "spacing description (e.g., 'Generous whitespace')",
    "alignment": "alignment description (e.g., "Left-aligned")"
  },
  "visualStyle": {
    "tags": ["style1", "style2", "style3"],
    "mood": "overall mood (e.g., 'Professional and modern')",
    "aesthetic": "aesthetic description"
  },
  "content": {
    "headings": ["heading1 text", "heading2 text"],
    "bodyText": ["body text snippet 1", "body text snippet 2"],
    "buttons": ["button text 1", "button text 2"]
  }
}

Please provide accurate hex codes and detailed descriptions.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vision API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      return JSON.parse(content);
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  }

  /**
   * Generate CSS and Markdown using Claude Sonnet 4.6
   */
  async generateDesignCode(analysis: VisionAnalysisResult): Promise<CodeGenerationResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          messages: [
            {
              role: 'user',
              content: `You are a design system expert. Based on the following design analysis, generate:

1. A complete CSS variables section with proper color system, typography scale, spacing tokens
2. A markdown documentation describing the design system
3. An AI prompt that can be used to recreate this design

Design Analysis:
${JSON.stringify(analysis, null, 2)}

Please respond with a JSON object in this exact format:
{
  "cssContent": "Complete CSS with @property or :root variables, including colors, typography, spacing, and utility classes",
  "markdownContent": "# Design System Documentation\\n\\n## Color Palette\\n\\n...",
  "promptContent": "A detailed prompt that another AI can use to recreate this design, including layout structure, colors, typography, spacing, and visual style"
}

Make the CSS production-ready with proper naming conventions (BEM or utility-first approach).`
            }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Code generation API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating code:', error);
      throw error;
    }
  }

  /**
   * Complete style extraction workflow: vision analysis → code generation
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

export default AIClient;