import type { Language } from '@/app/lib/i18n';
import type { ExportTab } from '@/app/lib/style-detail-types';

export type StyleDetailCopy = {
  tabs: Array<{ id: ExportTab; label: string; hint: string }>;
  sourceLabels: Record<string, string>;
  confidence: { high: string; medium: string; low: string };
  tokenUsage: {
    backgroundBase: string;
    surfaceElevated: string;
    foregroundPrimary: string;
    foregroundMuted: string;
    brandPrimary: string;
    brandAccent: string;
    borderDefault: string;
    success: string;
    warning: string;
    danger: string;
    fontFamily: string;
    headingWeight: string;
    bodyWeight: string;
    typeScale: string;
    letterSpacing: string;
    spacingDensity: string;
    spacingBaseUnit: string;
    radiusStyle: string;
    radiusValues: string;
    shadowStyle: string;
    layoutContainer: string;
    layoutAlignment: string;
  };
  ui: {
    unknownSource: string;
    lines: string;
    loadFailed: string;
    backToLibrary: string;
    loading: string;
    deleteConfirm: string;
    deleteFailed: string;
    shareFailed: string;
    shareCopied: string;
    shareLinkCopied: string;
    back: string;
    fallbackDescription: string;
    untitledStyle: string;
    styleSpec: string;
    metrics: { confidence: string; palette: string; sections: string; exports: string; tokens: string; formats: string };
    primaryActions: string;
    shareLink: string;
    openDnaCard: string;
    delete: string;
    copiedPrefix: string;
    sourceReference: string;
    originalReference: string;
    noThumbnail: string;
    visualFormula: string;
    styleConclusion: string;
    formulaDescription: string;
    colorTokens: string;
    colorSystem: string;
    copyReady: string;
    systemTokens: string;
    systemTokenTitle: string;
    exportConsole: string;
    editSpec: string;
    generatedContent: string;
    editorHint: string;
    outputHint: string;
    viewOutput: string;
    saving: string;
    saved: string;
    saveError: string;
    exportFormatLabel: string;
    emptyOutput: string;
    copy: string;
    copied: string;
    download: string;
    componentRules: string;
    componentRuleTitle: string;
    warnings: string;
    warningTitle: string;
  };
  componentFallbacks: { buttons: string; cards: (surface: string, border: string, shadow: string) => string; navigation: string };
};

export const STYLE_DETAIL_COPY: Record<Language, StyleDetailCopy> = {
  zh: {
    tabs: [
      { id: 'markdown', label: '报告', hint: '完整设计说明' },
      { id: 'css', label: 'CSS', hint: '变量输出' },
      { id: 'prompt', label: 'Prompt', hint: '复刻提示词' },
      { id: 'tailwind', label: 'Tailwind', hint: '配置 + 示例' },
      { id: 'shadcn', label: 'shadcn/ui', hint: '主题片段' },
    ],
    sourceLabels: { image: '图片分析', screenshot: '截图还原', url: '网页分析', user: '用户导入', demo: '示例风格' },
    confidence: { high: '高可信', medium: '中等可信', low: '需要复核' },
    tokenUsage: {
      backgroundBase: '页面或 app shell 底色', surfaceElevated: '卡片、面板、浮层背景', foregroundPrimary: '主要正文和标题', foregroundMuted: '说明、辅助、低优先级文本', brandPrimary: '主 CTA、焦点态、选中态', brandAccent: '高亮信息、强调符号、辅助品牌色', borderDefault: '分割线、卡片边框、输入框轮廓', success: '成功状态', warning: '警告状态', danger: '错误、删除、危险操作', fontFamily: '主字体栈', headingWeight: '标题字重', bodyWeight: '正文字重', typeScale: '字号层级密度', letterSpacing: '字间距特征', spacingDensity: '页面整体信息密度', spacingBaseUnit: '间距基准单位', radiusStyle: '圆角倾向', radiusValues: '组件圆角 Token', shadowStyle: '阴影/层级方式', layoutContainer: '内容容器宽度', layoutAlignment: '对齐方式',
    },
    ui: {
      unknownSource: '来源未知', lines: '行', loadFailed: '加载风格详情失败', backToLibrary: '返回风格库', loading: '正在加载 Style Spec...', deleteConfirm: '确定要删除这个风格吗？', deleteFailed: '删除失败，请重试', shareFailed: '分享失败，请重试', shareCopied: '分享链接已复制到剪贴板！', shareLinkCopied: '已复制：', back: '← 返回', fallbackDescription: '从参考图中提取出的视觉风格、设计 Token 和复刻提示词。', untitledStyle: '未命名风格', styleSpec: 'Style Spec', metrics: { confidence: '置信度', palette: '色板', sections: '区块', exports: '导出', tokens: '个 Token', formats: '种格式' }, primaryActions: '主要操作', shareLink: '分享链接', openDnaCard: '打开 DNA Card', delete: '删除', copiedPrefix: '已复制：', sourceReference: '来源参考', originalReference: '原始参考图', noThumbnail: '暂无缩略图', visualFormula: '视觉公式', styleConclusion: '风格结论', formulaDescription: '这份报告把参考图拆成可执行的设计 Token、组件规则与复刻提示词。优先复用 Token，再按组件规则还原页面，而不是只照抄表面颜色。', colorTokens: '色彩 Token', colorSystem: '色彩体系', copyReady: '可复制', systemTokens: '系统 Token', systemTokenTitle: '排版、间距、布局', exportConsole: '导出控制台', editSpec: '编辑 Style Spec', generatedContent: '生成内容', editorHint: '修改 Spec 后会自动保存并重新生成输出。', outputHint: '完整内容', viewOutput: '查看输出', saving: '⏳ 保存中...', saved: '✓ 已保存', saveError: '⚠ 保存失败', exportFormatLabel: '导出格式', emptyOutput: '当前格式暂无内容。请编辑 Style Spec 或重新生成分析。', copy: '复制', copied: '已复制！', download: '下载', componentRules: '组件规则', componentRuleTitle: '组件复刻规则', warnings: '警告', warningTitle: '需要人工复核',
    },
    componentFallbacks: {
      buttons: '使用主色表达主要操作，次级按钮保持低对比边框或 surface。',
      cards: (surface, border, shadow) => `使用 ${surface} 作为卡片背景，${border} 作为边框，阴影保持 ${shadow}。`,
      navigation: '导航需保持清晰当前位置、稳定间距和足够触控区域。',
    },
  },
  en: {
    tabs: [
      { id: 'markdown', label: 'Report', hint: 'Complete design report' },
      { id: 'css', label: 'CSS', hint: 'Variable output' },
      { id: 'prompt', label: 'Prompt', hint: 'Restoration prompt' },
      { id: 'tailwind', label: 'Tailwind', hint: 'Config + example' },
      { id: 'shadcn', label: 'shadcn/ui', hint: 'Theme snippet' },
    ],
    sourceLabels: { image: 'Image analysis', screenshot: 'Screenshot restoration', url: 'Website analysis', user: 'User import', demo: 'Demo style' },
    confidence: { high: 'High confidence', medium: 'Medium confidence', low: 'Needs review' },
    tokenUsage: {
      backgroundBase: 'Page or app-shell background', surfaceElevated: 'Cards, panels, overlays', foregroundPrimary: 'Primary body text and headings', foregroundMuted: 'Helper and low-priority text', brandPrimary: 'Primary CTA, focus, selected states', brandAccent: 'Highlights, emphasis marks, secondary brand color', borderDefault: 'Dividers, card borders, input outlines', success: 'Success state', warning: 'Warning state', danger: 'Error, delete, destructive actions', fontFamily: 'Primary font stack', headingWeight: 'Heading weight', bodyWeight: 'Body weight', typeScale: 'Type scale density', letterSpacing: 'Letter-spacing behavior', spacingDensity: 'Overall UI density', spacingBaseUnit: 'Spacing base unit', radiusStyle: 'Radius tendency', radiusValues: 'Component radius tokens', shadowStyle: 'Shadow/elevation model', layoutContainer: 'Content container width', layoutAlignment: 'Alignment behavior',
    },
    ui: {
      unknownSource: 'Unknown source', lines: 'lines', loadFailed: 'Failed to load style details', backToLibrary: 'Back to library', loading: 'Loading Style Spec...', deleteConfirm: 'Delete this style?', deleteFailed: 'Delete failed. Please try again', shareFailed: 'Share failed. Please try again', shareCopied: 'Share link copied to clipboard!', shareLinkCopied: 'Copied: ', back: '← Back', fallbackDescription: 'Visual style, design tokens, and restoration prompts extracted from the reference.', untitledStyle: 'Untitled style', styleSpec: 'Style Spec', metrics: { confidence: 'Confidence', palette: 'Palette', sections: 'Sections', exports: 'Exports', tokens: 'tokens', formats: 'formats' }, primaryActions: 'Primary actions', shareLink: 'Share link', openDnaCard: 'Open DNA Card', delete: 'Delete', copiedPrefix: 'Copied: ', sourceReference: 'Source reference', originalReference: 'Original reference', noThumbnail: 'No thumbnail', visualFormula: 'Visual formula', styleConclusion: 'Style conclusion', formulaDescription: 'This report turns the reference into actionable design tokens, component rules, and restoration prompts. Reuse tokens first, then rebuild with component rules instead of copying surface colors only.', colorTokens: 'Color tokens', colorSystem: 'Color system', copyReady: 'copy-ready', systemTokens: 'System tokens', systemTokenTitle: 'Type, spacing, layout', exportConsole: 'Export console', editSpec: 'Edit Style Spec', generatedContent: 'Generated content', editorHint: 'Changes auto-save and regenerate the outputs.', outputHint: 'Complete content', viewOutput: 'View output', saving: '⏳ Saving...', saved: '✓ Saved', saveError: '⚠ Save failed', exportFormatLabel: 'Export formats', emptyOutput: 'No content for this format yet. Edit the Style Spec or regenerate analysis.', copy: 'Copy', copied: 'Copied!', download: 'Download', componentRules: 'Component rules', componentRuleTitle: 'Component rebuild rules', warnings: 'Warnings', warningTitle: 'Human review needed',
    },
    componentFallbacks: {
      buttons: 'Use the primary color for main actions; keep secondary buttons as low-contrast borders or surfaces.',
      cards: (surface, border, shadow) => `Use ${surface} as card background, ${border} as border, and keep shadows ${shadow}.`,
      navigation: 'Navigation should keep current location clear, spacing stable, and touch targets large enough.',
    },
  },
};
