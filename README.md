# Zomo Design Office

一个设计风格 DNA 提取与管理工具，帮助你收集、提取、复用设计风格。

## 功能特点

- 🎨 **风格提取**：上传图片或输入URL，AI自动分析设计风格
- 🎯 **风格库管理**：保存和管理你的设计风格参考
- 📋 **多格式导出**：生成Markdown、CSS和AI绘画提示词
- 🔍 **搜索筛选**：快速找到你需要的设计风格
- 💾 **本地存储**：所有数据保存在浏览器本地，无需服务器

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- localStorage

## 开始使用

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
├── app/
│   ├── components/       # 组件
│   ├── lib/             # 工具函数
│   ├── style/           # 风格详情页
│   ├── extract/         # 风格提取页
│   ├── manage/          # 管理页
│   ├── compare/         # 生图对比页
│   ├── records/         # 我的记录页
│   └── page.tsx         # 首页
├── types/               # TypeScript类型定义
└── public/              # 静态资源
```

## 使用说明

1. **提取风格**：访问"提取风格"页面，上传图片或输入图片URL
2. **查看分析结果**：AI会自动分析色彩、排版、视觉风格等
3. **保存风格**：分析完成后自动保存到风格库
4. **导出内容**：在详情页可以复制Markdown、CSS或AI提示词
5. **管理风格**：在"管理"页面可以搜索、筛选和删除风格

## 注意事项

- 当前版本使用模拟AI分析，实际项目需要接入真实的AI API
- 所有数据存储在浏览器localStorage中，清除浏览器数据会丢失
- 建议定期导出重要的风格数据

## 开发计划

- [ ] 接入真实AI分析API
- [ ] 支持批量导出
- [ ] 添加云端同步功能
- [ ] 优化生图对比功能
- [ ] 完善操作记录统计

## License

MIT
