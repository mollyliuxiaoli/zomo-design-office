import type { Language } from '@/app/lib/i18n';

export type AnalyzeMode = 'image' | 'screenshot' | 'url';
export type AnalyzeStatus = 'idle' | 'running' | 'success' | 'error';

export const ANALYZE_MODE_ORDER: AnalyzeMode[] = ['image', 'screenshot', 'url'];

export type AnalyzeModeState = {
  styleName: string;
  file: File | null;
  preview: string;
  imageUrl: string;
  targetUrl: string;
  status: AnalyzeStatus;
  error: string;
  progress: string;
};

export type AnalyzeStates = Record<AnalyzeMode, AnalyzeModeState>;

export type AnalyzeModeCopy = {
  label: string;
  title: string;
  job: string;
  description: string;
  helper: string;
  primaryInputLabel: string;
  cta: string;
  emptyCta: string;
  uploadLabel?: string;
  uploadHint?: string;
  urlLabel?: string;
  urlHelper?: string;
  placeholder: string;
  accepts: string;
  output: string[];
};

export type AnalyzeCopy = {
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  outputTitle: string;
  outputHints: string[];
  beforeTitle: string;
  beforeBullets: string[];
  tablistLabel: string;
  common: {
    styleName: string;
    optional: string;
    stylePlaceholder: string;
    localFileSelected: string;
    remove: string;
    clear: string;
    orPasteImageUrl: string;
    imagePreview: string;
    analyzing: string;
    waitingForOtherMode: (label: string) => string;
    otherModeRunning: (label: string) => string;
    statusRunning: string;
    statusError: string;
    statusReady: string;
    fileTypeError: string;
    fileSizeError: string;
    imageRequired: string;
    urlRequired: string;
    unsupportedImageUrl: string;
    downloadImage: string;
    prepare: string;
    compress: string;
    aiAnalyzing: string;
    serverFallback: string;
    compactRetry: string;
    webAnalyzing: string;
    save: string;
    tokenError: string;
    invalidAIShape: string;
    imageProcessingFailed: string;
  };
  modes: Record<AnalyzeMode, AnalyzeModeCopy>;
};

const BASE_PROMPT = 'Return ONLY one compact valid JSON object. No markdown, no prose. Keep under 1200 characters: strings <= 12 words, arrays <= 3 items. Required keys: styleName, colors, typography, spacing, radius, shadow, layout, components, vibe, content, meta. Enums: typography.fontStyle sans|serif|mono|mixed; typography.scale compact|balanced|display; spacing.density compact|comfortable|spacious; radius.style sharp|subtle|rounded|pill; shadow.style none|soft|crisp|dramatic; layout.container narrow|medium|wide|full; layout.alignment left|center|mixed.';

const JSON_SHAPE = 'Shape: {"styleName":"","colors":{"background":["#fff"],"foreground":["#111"],"primary":["#2563eb"],"accent":["#f43f5e"],"border":["#e5e7eb"]},"typography":{"fontStyle":"sans","suggestedFonts":["Inter"],"scale":"balanced"},"spacing":{"density":"comfortable","baseUnit":"8px"},"radius":{"style":"rounded","values":["8px"]},"shadow":{"style":"soft"},"layout":{"composition":"","container":"wide","alignment":"mixed","sectionCount":3},"components":{"buttons":"","cards":"","navigation":""},"vibe":{"keywords":[""],"description":"","avoid":[]},"content":{"headings":[""],"buttons":[""]},"meta":{"confidence":80,"warnings":[]}}';

const PROMPT_TASKS: Record<Exclude<AnalyzeMode, 'url'>, string> = {
  image: 'Task: extract design tokens and visual DNA from the reference image; prioritize colors, typography, spacing, radius, shadows, component style, and concise implementation cues.',
  screenshot: 'Task: restoration-focused screenshot analysis; prioritize layout composition, section order, component relationships, reusable UI rules, and prompts a builder can use to recreate the screen.',
};

export function getStyleAnalysisPrompt(mode: Exclude<AnalyzeMode, 'url'> = 'image'): string {
  return `${BASE_PROMPT} ${PROMPT_TASKS[mode]} ${JSON_SHAPE}`;
}

export const ANALYZE_COPY: Record<Language, AnalyzeCopy> = {
  zh: {
    eyebrow: '分析',
    heroTitle: '输入参考图，输出可复刻的设计 DNA',
    heroDescription: '选择图片、截图或网站 URL，Distill 会把视觉风格拆成设计 Token、组件语言和可直接复制给 AI 的还原提示词。',
    outputTitle: '你会得到',
    outputHints: ['CSS 变量', 'Tailwind 配置', 'shadcn/ui 主题', '还原提示词'],
    beforeTitle: '分析前你会知道',
    beforeBullets: [
      '图片分析用于提取视觉 Token；截图还原用于生成复刻说明；网页分析用于抓取公开 URL。',
      '图片/截图推荐小于 10MB；网页模式不支持登录、验证码或内网页面。',
      '分析通常需要 30–60 秒；失败会自动重试并给出可操作错误。',
    ],
    tablistLabel: '分析模式',
    common: {
      styleName: '风格名称',
      optional: '可选',
      stylePlaceholder: '例如：极简仪表盘',
      localFileSelected: '已选择本地文件',
      remove: '移除',
      clear: '清空',
      orPasteImageUrl: '或粘贴图片直链',
      imagePreview: '图片预览',
      analyzing: '分析中...',
      waitingForOtherMode: (label) => `请先等待「${label}」完成`,
      otherModeRunning: (label) => `「${label}」正在执行，当前页保持独立输入。`,
      statusRunning: '运行中',
      statusError: '失败',
      statusReady: '已就绪',
      fileTypeError: '请上传 PNG、JPG、GIF 或 WebP 图片',
      fileSizeError: '文件过大，请上传小于 10MB 的图片',
      imageRequired: '请先上传图片或输入图片 URL',
      urlRequired: '请输入网页 URL',
      unsupportedImageUrl: '图片 URL 仅支持 HTTP/HTTPS',
      downloadImage: '[1/4] 下载图片...',
      prepare: '[1/4] 准备分析...',
      compress: '[2/4] 压缩图片...',
      aiAnalyzing: '[3/4] AI 分析中，请耐心等待（约 30–60 秒）...',
      serverFallback: '[3/4] 浏览器直连失败，正在切换到服务器重试...',
      compactRetry: '[3/4] AI 服务不稳定，正在自动压缩并重试...',
      webAnalyzing: '[2/4] 抓取网页并分析视觉系统...',
      save: '[4/4] 保存结果...',
      tokenError: '无法获取 API 授权，请刷新页面后重试',
      invalidAIShape: 'AI 返回了无效数据格式，请重试一次',
      imageProcessingFailed: '图片处理失败，请重新上传',
    },
    modes: {
      image: {
        label: '图片分析',
        title: '从单张图片提取视觉 Token',
        job: '把一张参考图拆成颜色、字体、间距、圆角、阴影和组件风格。',
        description: '适合海报、组件截图、App 界面、设计稿或任何视觉参考图。输出更偏 Design Token 和风格摘要。',
        helper: '如果你只想知道“这张图是什么风格、怎么复用”，选这个。',
        primaryInputLabel: '上传或粘贴图片',
        cta: '开始分析图片',
        emptyCta: '请先上传图片或输入 URL',
        uploadLabel: '上传图片',
        uploadHint: '拖拽图片到这里，或点击选择文件',
        urlLabel: '图片 URL',
        urlHelper: '请输入可公开访问的图片直链；填写 URL 会自动替换本地上传文件。',
        placeholder: 'https://example.com/image.png',
        accepts: 'PNG / JPG / GIF / WebP · 最大 10MB',
        output: ['颜色与字体 Token', '组件风格摘要', '可复用设计 DNA'],
      },
      screenshot: {
        label: '截图还原',
        title: '把截图转成复刻说明书',
        job: '把完整界面拆成布局结构、组件关系和可执行的还原提示词。',
        description: '适合“照着做一个类似页面”的场景。输出会更关注版式、信息层级、组件清单和还原提示词。',
        helper: '如果你想让 AI 或前端照着截图复刻界面，选这个。',
        primaryInputLabel: '上传或粘贴截图',
        cta: '开始还原截图',
        emptyCta: '请先上传截图或输入 URL',
        uploadLabel: '上传截图',
        uploadHint: '建议上传完整页面或关键界面截图',
        urlLabel: '截图 URL',
        urlHelper: '建议使用完整页面截图直链；宽度 ≥ 1200px 时布局判断更稳定。',
        placeholder: 'https://example.com/screenshot.png',
        accepts: 'PNG / JPG / WebP · 最大 10MB',
        output: ['布局地图', '组件关系', '还原提示词'],
      },
      url: {
        label: '网页分析',
        title: '抓取公开网页并提取设计系统',
        job: '从公开 URL 抓取页面结构、颜色和文本线索，生成网页级设计系统草稿。',
        description: '适合竞品、灵感站和线上产品。它不是图片上传：系统会先抓取 URL，再根据页面结构推断视觉系统。',
        helper: '如果目标是一个可公开访问的网站，选这个；登录页、验证码和内网页面不支持。',
        primaryInputLabel: '输入网页 URL',
        cta: '开始分析网页',
        emptyCta: '请先输入网页 URL',
        placeholder: 'https://linear.app',
        accepts: '公开 HTTP/HTTPS URL',
        output: ['页面结构', '推断颜色/字体', '网页级风格报告'],
      },
    },
  },
  en: {
    eyebrow: 'Analyze',
    heroTitle: 'Turn references into reusable design DNA',
    heroDescription: 'Upload an image, a screenshot, or a public website URL. Distill converts the visual language into design tokens, component rules, and AI-ready restoration prompts.',
    outputTitle: 'Outputs',
    outputHints: ['CSS Variables', 'Tailwind Config', 'shadcn/ui Theme', 'Restoration Prompt'],
    beforeTitle: 'Before you run it',
    beforeBullets: [
      'Image analysis extracts visual tokens; screenshot restoration creates rebuild instructions; website analysis fetches a public URL.',
      'Images/screenshots should be under 10MB; website mode cannot access login, CAPTCHA, or private pages.',
      'Analysis usually takes 30–60 seconds; transient AI failures are retried with actionable errors.',
    ],
    tablistLabel: 'Analysis mode',
    common: {
      styleName: 'Style name',
      optional: 'optional',
      stylePlaceholder: 'e.g. Minimal dashboard',
      localFileSelected: 'local file selected',
      remove: 'Remove',
      clear: 'Clear',
      orPasteImageUrl: 'or paste an image URL',
      imagePreview: 'Image preview',
      analyzing: 'Analyzing...',
      waitingForOtherMode: (label) => `Wait for ${label} to finish`,
      otherModeRunning: (label) => `${label} is running; this tab keeps its own input.`,
      statusRunning: 'Running',
      statusError: 'Failed',
      statusReady: 'Ready',
      fileTypeError: 'Upload a PNG, JPG, GIF, or WebP image',
      fileSizeError: 'File is too large. Please upload an image under 10MB',
      imageRequired: 'Upload an image or enter an image URL first',
      urlRequired: 'Enter a website URL',
      unsupportedImageUrl: 'Image URL must use HTTP/HTTPS',
      downloadImage: '[1/4] Downloading image...',
      prepare: '[1/4] Preparing analysis...',
      compress: '[2/4] Compressing image...',
      aiAnalyzing: '[3/4] AI is analyzing. This can take 30–60 seconds...',
      serverFallback: '[3/4] Browser request failed. Retrying through the server...',
      compactRetry: '[3/4] AI service is unstable. Compressing further and retrying...',
      webAnalyzing: '[2/4] Fetching website and inferring visual system...',
      save: '[4/4] Saving result...',
      tokenError: 'Could not get API authorization. Refresh and try again',
      invalidAIShape: 'AI returned an invalid data shape. Please try again',
      imageProcessingFailed: 'Image processing failed. Please upload again',
    },
    modes: {
      image: {
        label: 'Image analysis',
        title: 'Extract visual tokens from one image',
        job: 'Break one reference image into color, type, spacing, radius, shadow, and component style.',
        description: 'Best for posters, component captures, app screens, mockups, or visual references. The output focuses on design tokens and style DNA.',
        helper: 'Choose this when you want to know what style the image uses and how to reuse it.',
        primaryInputLabel: 'Upload or paste an image',
        cta: 'Analyze image',
        emptyCta: 'Upload an image or enter a URL first',
        uploadLabel: 'Upload image',
        uploadHint: 'Drop an image here, or click to choose a file',
        urlLabel: 'Image URL',
        urlHelper: 'Paste a publicly accessible direct image URL. A URL replaces the local upload.',
        placeholder: 'https://example.com/image.png',
        accepts: 'PNG / JPG / GIF / WebP · max 10MB',
        output: ['Color and type tokens', 'Component style summary', 'Reusable design DNA'],
      },
      screenshot: {
        label: 'Screenshot restoration',
        title: 'Convert a screenshot into rebuild instructions',
        job: 'Map a full screen into layout structure, component relationships, and executable restoration prompts.',
        description: 'Best when you want to recreate a similar page. The output emphasizes layout, hierarchy, component inventory, and Restoration Prompt.',
        helper: 'Choose this when an AI builder or frontend engineer should rebuild from the screenshot.',
        primaryInputLabel: 'Upload or paste a screenshot',
        cta: 'Restore screenshot',
        emptyCta: 'Upload a screenshot or enter a URL first',
        uploadLabel: 'Upload screenshot',
        uploadHint: 'Full-page or key-screen screenshots work best',
        urlLabel: 'Screenshot URL',
        urlHelper: 'Use a full-page screenshot URL when possible. Width ≥ 1200px improves layout detection.',
        placeholder: 'https://example.com/screenshot.png',
        accepts: 'PNG / JPG / WebP · max 10MB',
        output: ['Layout map', 'Component relationships', 'Restoration Prompt'],
      },
      url: {
        label: 'Website analysis',
        title: 'Fetch a public website and infer its design system',
        job: 'Scrape structure, colors, and text cues from a public URL to create a website-level style draft.',
        description: 'Best for competitors, inspiration sites, and live products. This is not image upload: Distill fetches the URL first, then infers the visual system.',
        helper: 'Choose this for a public website. Login, CAPTCHA, and private pages are not supported.',
        primaryInputLabel: 'Enter a website URL',
        cta: 'Analyze website',
        emptyCta: 'Enter a website URL first',
        placeholder: 'https://linear.app',
        accepts: 'Public HTTP/HTTPS URL',
        output: ['Page structure', 'Inferred colors/type', 'Website style report'],
      },
    },
  },
};

export function getAnalyzeCopy(language: Language): AnalyzeCopy {
  return ANALYZE_COPY[language] ?? ANALYZE_COPY.zh;
}

export function createInitialModeState(): AnalyzeModeState {
  return {
    styleName: '',
    file: null,
    preview: '',
    imageUrl: '',
    targetUrl: '',
    status: 'idle',
    error: '',
    progress: '',
  };
}

export function createInitialAnalyzeStates(): AnalyzeStates {
  return {
    image: createInitialModeState(),
    screenshot: createInitialModeState(),
    url: createInitialModeState(),
  };
}

export function hasImageInput(state: AnalyzeModeState): boolean {
  return Boolean(state.preview || state.imageUrl.trim());
}

export function canAnalyzeMode(mode: AnalyzeMode, state: AnalyzeModeState, runningMode: AnalyzeMode | null): boolean {
  if (runningMode) return false;
  if (mode === 'url') return state.targetUrl.trim().length > 0;
  return hasImageInput(state);
}
