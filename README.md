# 🐺 狼码纪 (WolfCode Chronicles)

一个基于 [Astro 5](https://astro.build/) 构建的现代个人技术博客，专注于极速性能与卓越的阅读体验。

[![Built with Astro](https://astro.build/actions/loading.svg)](https://astro.build)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-orange?logo=cloudflare)](https://pages.cloudflare.com/)

🌐 **在线访问**: [https://codewolffy.pages.dev](https://codewolffy.pages.dev)

## ✨ 特性 (Features)

- ⚡ **极致性能** - 基于 Astro 5 静态生成 (SSG) + 混合渲染，秒级加载。
- 🎨 **精美 UI** - 现代化设计，磨砂玻璃效果，平滑的动画交互。
- 🌗 **昼夜模式** - 完美适配深色/浅色主题，代码块自动切换主题 (One Dark/One Light)。
- 📝 **Keystatic CMS** - 内置可视化内容管理系统，像 Notion 一样写作。
- 🔍 **全文搜索** - 集成 Pagefind，支持中文分词与快速搜索。
- 💬 **评论系统** - 集成 Giscus (GitHub Discussions) 评论区。
- 📑 **智能目录** - 自动生成文章目录 (TOC)，支持滚动高亮与移动端折叠。
- 🏷️ **分类标签** - 完善的文章分类与标签管理系统。
- 📊 **阅读统计** - 自动计算文章阅读时间。
- 📱 **完全响应式** - 针对移动端、平板和桌面端深度优化。

## 🛠️ 技术栈 (Tech Stack)

| 类别 | 技术 | 说明 |
| :--- | :--- | :--- |
| **核心框架** | [Astro 5](https://astro.build/) | 下一代静态站点生成器 |
| **UI 框架** | [React 19](https://react.dev/) | 用于构建复杂的交互组件 |
| **样式方案** | [Tailwind CSS 4](https://tailwindcss.com/) | 原子化 CSS 框架 (Vite 插件版) |
| **CMS** | [Keystatic](https://keystatic.com/) | 基于 Git 的无头 CMS |
| **图标库** | [Lucide React](https://lucide.dev/) | 统一且美观的图标集 |
| **搜索** | [Pagefind](https://pagefind.app/) | 静态站点专用搜索引擎 |
| **部署** | [Cloudflare Pages](https://pages.cloudflare.com/) | 全球边缘网络托管 |

## 📂 目录结构

```text
├── public/            # 静态资源 (图片, favicon 等)
├── src/
│   ├── components/    # React 组件 (UI, 布局, 功能组件)
│   ├── content/       # 博客内容 (MDX, JSON 数据)
│   ├── layouts/       # 页面布局模板
│   ├── lib/           # 工具函数与配置
│   ├── pages/         # 页面路由与 API 端点
│   └── styles/        # 全局样式
├── astro.config.mjs   # Astro 配置文件
├── keystatic.config.ts # CMS 配置文件
└── tailwind.config.mjs # Tailwind 配置
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/codewolffy/codewolffy.github.io.git
cd codewolffy.github.io
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发环境

```bash
npm run dev
```
访问 `http://localhost:4321` 查看博客。
访问 `http://localhost:4321/keystatic` 进入后台管理内容。

### 4. 构建生产版本

```bash
npm run build
```

## 📝 内容管理 (CMS)

本项目集成 **Keystatic**，提供两种管理方式：

1.  **本地模式**: 运行 `npm run dev` 后访问 `/keystatic`，内容将直接保存到本地文件系统。
2.  **GitHub 模式**: 部署后，通过配置 GitHub OAuth，可以直接在线编辑并推送到仓库。

### Frontmatter 规范

在 `src/content/blog/` 下的手动创建 `.mdx` 文件示例：

```yaml
---
title: "我的新文章"
description: "这是一篇关于..."
pubDate: 2024-03-21
updatedDate: 2024-03-22 # 可选
heroImage: "/images/posts/cover.jpg" # 可选
category: "frontend" # 对应 src/content/categories/ 下的文件名
tags: ["react", "astro"] # 对应 src/content/tags/ 下的文件名
draft: false # 是否草稿
---
```

## ⚙️ 部署 (Cloudflare Pages)

1.  登录 Cloudflare Dashboard。
2.  进入 **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**。
3.  选择本项目仓库。
4.  **Build settings**:
    *   **Framework preset**: `Astro`
    *   **Build command**: `npm run build`
    *   **Output directory**: `dist`
5.  **Environment variables** (用于 Keystatic 线上编辑):
    *   `KEYSTATIC_GITHUB_CLIENT_ID`: 你的 GitHub OAuth Client ID
    *   `KEYSTATIC_GITHUB_CLIENT_SECRET`: 你的 GitHub OAuth Client Secret
    *   `KEYSTATIC_SECRET`: 随机生成的加密密钥

## 📄 License

MIT © [CodeWolffy](https://github.com/CodeWolffy)
