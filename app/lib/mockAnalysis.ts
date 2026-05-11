import { Style } from '@/types/style';

// 模拟AI分析结果
export const mockStyleAnalysis = async (imageUrl: string, name?: string): Promise<Style> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 2000));

  const id = Date.now().toString();
  const now = new Date().toISOString();

  // 随机选择一个风格类型
  const styleTypes = [
    {
      name: '极简主义风格',
      tags: ['Minimalist', 'Clean'],
      projectType: 'Landing Page',
      colors: {
        primary: ['#000000', '#FFFFFF'],
        secondary: ['#F5F5F5', '#E0E0E0'],
        background: ['#FFFFFF', '#FAFAFA']
      },
      visualStyle: ['极简', '现代', '留白', '清爽']
    },
    {
      name: '野兽主义风格',
      tags: ['Brutalist', 'Bold'],
      projectType: 'Portfolio',
      colors: {
        primary: ['#FF0000', '#0000FF'],
        secondary: ['#FFFF00', '#00FF00'],
        background: ['#000000', '#1A1A1A']
      },
      visualStyle: ['大胆', '冲突', '原始', '叛逆']
    },
    {
      name: '编辑设计风格',
      tags: ['Editorial', 'Elegant'],
      projectType: 'Magazine',
      colors: {
        primary: ['#1C1C1C', '#8B4513'],
        secondary: ['#D4AF37', '#F5DEB3'],
        background: ['#FFFAF0', '#FAF0E6']
      },
      visualStyle: ['优雅', '文艺', '精致', '复古']
    },
    {
      name: '企业级设计',
      tags: ['Corporate', 'Professional'],
      projectType: 'Dashboard',
      colors: {
        primary: ['#0066CC', '#004499'],
        secondary: ['#6C757D', '#ADB5BD'],
        background: ['#FFFFFF', '#F8F9FA']
      },
      visualStyle: ['专业', '可靠', '商务', '稳重']
    },
    {
      name: '俏皮风格',
      tags: ['Playful', 'Fun'],
      projectType: 'App',
      colors: {
        primary: ['#FF6B6B', '#4ECDC4'],
        secondary: ['#FFE66D', '#95E1D3'],
        background: ['#FFF5F5', '#F0FFF4']
      },
      visualStyle: ['活泼', '有趣', '色彩丰富', '动感']
    }
  ];

  const selectedStyle = styleTypes[Math.floor(Math.random() * styleTypes.length)];
  const styleName = name || selectedStyle.name;

  const markdownContent = `# ${styleName}

## 风格描述
这是一种${selectedStyle.visualStyle.join('、')}的设计风格，适合用于${selectedStyle.projectType}项目。

## 色彩体系
- **主色**: ${selectedStyle.colors.primary.join(', ')}
- **辅色**: ${selectedStyle.colors.secondary.join(', ')}
- **背景色**: ${selectedStyle.colors.background.join(', ')}

## 排版特征
- **标题字体**: 现代无衬线字体，字重700
- **正文字体**: 清晰易读，行高1.6
- **字间距**: 适度宽松，增强可读性

## 视觉元素
- ${selectedStyle.visualStyle.map(s => `- ${s}`).join('\n- ')}

## 适用场景
${selectedStyle.projectType}、品牌形象、网页设计`;

  const cssContent = `/* ${styleName} - Color Palette */
:root {
  /* Primary Colors */
  --color-primary: ${selectedStyle.colors.primary[0]};
  --color-primary-light: ${selectedStyle.colors.primary[1] || selectedStyle.colors.primary[0]};

  /* Secondary Colors */
  --color-secondary: ${selectedStyle.colors.secondary[0]};
  --color-secondary-light: ${selectedStyle.colors.secondary[1] || selectedStyle.colors.secondary[0]};

  /* Background Colors */
  --color-bg: ${selectedStyle.colors.background[0]};
  --color-bg-alt: ${selectedStyle.colors.background[1] || selectedStyle.colors.background[0]};

  /* Typography */
  --font-heading: 'Inter', -apple-system, sans-serif;
  --font-body: 'Inter', -apple-system, sans-serif;

  /* Spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 2rem;
  --spacing-lg: 4rem;
}

/* Base Styles */
body {
  font-family: var(--font-body);
  background-color: var(--color-bg);
  color: var(--color-primary);
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.2;
}

/* Buttons */
.btn-primary {
  background-color: var(--color-primary);
  color: ${selectedStyle.colors.primary[0] === '#000000' ? '#fff' : '#000'};
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  border-radius: 4px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.8;
}`;

  const promptContent = `${selectedStyle.visualStyle.join('、')}的${selectedStyle.projectType}设计风格，使用${selectedStyle.colors.primary[0]}作为主色调，${selectedStyle.colors.secondary[0]}作为辅助色。整体风格${selectedStyle.tags[0].toLowerCase()}，${selectedStyle.visualStyle.join('、')}。现代简约设计，高质量，专业，detailed, ultra detailed, 8k resolution`;

  return {
    id,
    name: styleName,
    description: `这是一种${selectedStyle.visualStyle.join('、')}的设计风格，展现${selectedStyle.tags[0]}美学特征。`,
    imageUrl,
    createdAt: now,
    styleTags: selectedStyle.tags,
    projectType: selectedStyle.projectType,
    colors: selectedStyle.colors,
    typography: {
      headings: '现代无衬线字体',
      body: '清晰易读字体',
      description: '字重700-400，行高1.2-1.6'
    },
    visualStyle: selectedStyle.visualStyle,
    markdownContent,
    cssContent,
    promptContent
  };
};
