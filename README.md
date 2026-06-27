# 🐺 狼码纪 (WolfCode Chronicles)

> **探索技术、编程与设计的边界**

一个基于 [Astro 6](https://astro.build/) 构建的现代个人技术博客，完美融合了极速性能与卓越的用户体验。本项目采用最新的前沿 Web 技术栈（React 18.3、Tailwind CSS 4.1、Keystatic 0.5），旨在提供一个开箱即用、功能强大且设计精美的高性能博客解决方案。

[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-orange?logo=cloudflare)](https://pages.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

🌐 **在线演示**: [https://codewolffy.pages.dev](https://codewolffy.pages.dev) | [备用节点](https://codewolffy.github.io)

---

## ✨ 核心特性详解 (Detailed Features)

### 🏗️ 架构与性能 (Architecture & Performance)

- **极速加载**: 基于 **Astro 6** 的静态生成 (SSG) 架构，默认移除未使用的 JavaScript，仅在需要交互的组件上使用 React Hydration (岛屿架构)。
- **混合渲染 (Hybrid Rendering)**: 结合静态页面与按需服务器端渲染 (SSR) API，兼顾 SEO 与动态功能。
- **现代化构建**: 利用 **Vite 7** + **esbuild 0.28** 进行极速构建，并使用 esbuild 压缩产物，最大化构建速度与缓存利用率。
- **Core Web Vitals**: 在 Mobile/Web 端均能达到 Lighthouse 满分 💯 性能表现。

### 🎨 UI 与交互 (UI & Interaction)

- **视觉设计**: 采用现代化的磨砂玻璃 (Glassmorphism) 风格，结合流畅的 CSS Mask 动画与微交互。
- **智能昼夜模式**:
  - 自动跟随系统颜色偏好 (Prever-Color-Scheme)。
  - 实现 **无闪烁 (No-FOUC)** 主题切换逻辑。
  - **代码高亮适配**: 自动切换 Shiki 主题 —— 浅色模式使用 `one-light`，深色模式使用 `one-dark-pro`。
- **图片体验**:
  - **自动懒加载**: 所有 Markdown 图片自动处理宽高属性，防止布局偏移 (CLS)。
  - **灯箱效果**: 集成 `medium-zoom`，支持点击平滑放大预览。

### 🧩 丰富功能 (Rich Functionality)

- **全文搜索**: 集成 **Pagefind**，构建时生成静态索引，支持高性能的中文分词搜索，无需任何后端服务。
- **多维度浏览**:
  - **智能目录 (TOC)**: 自动生成侧边栏目录，支持滚动高亮与移动端折叠。
  - **面包屑导航**: 自动生成层级路径，符合 Schema.org 规范。
  - **分类与标签**: 完善的文章分类归档系统。
- **评论系统**: 深度集成 **Giscus** (基于 GitHub Discussions)，无数据库依赖，支持 Markdown 评论与表情反应。
- **数据导出**:
  - **单篇导出**: 支持将文章导出为 **Markdown** (保留 Frontmatter) 或 **HTML** (内联样式) 格式。
  - **批量导出**: 管理员后台提供全量文章数据导出功能。
- **RSS 订阅**: 自动生成标准 RSS 2.0 Feed，通过 `rss.xml.js` 动态适配访问域名。

### 📝 CMS 内容管理 (Content Management)

**Keystatic** 是一款基于 Git 的无头 CMS，本项目已配置以下集合：

- **文章 (Posts)**: 撰写博客，支持 Frontmatter、封面图、草稿状态。
- **页面 (Pages)**: 管理“关于我”、“友链”等单页内容。
- **分类 (Categories) / 标签 (Tags)**: 统一管理分类元数据。
- **项目 (Projects)**: 展示个人作品集。
- **友链 (Friends)**: 管理友情链接数据。

---

## 🛠️ 技术栈全景 (Tech Stack)

| 领域         | 核心库                                                      | 版本     | 作用说明                              |
| :----------- | :---------------------------------------------------------- | :------- | :------------------------------------ |
| **Core**     | [Astro](https://astro.build/)                               | v6.4.8   | 静态站点生成器，路由管理              |
| **Build**    | [Vite](https://vitejs.dev/)                                 | v7.3.5   | 极速构建引擎与开发服务器              |
| **UI**       | [React](https://react.dev/)                                 | v18.3.1  | 构建交互式岛屿组件 (Search, Comments) |
| **Language** | [TypeScript](https://www.typescriptlang.org/)               | v5.9.3   | 类型安全的 JavaScript 超集            |
| **Style**    | [Tailwind CSS](https://tailwindcss.com/)                    | v4.1.18  | CSS 框架 (配合 Vite 插件)             |
| **CMS**      | [Keystatic](https://keystatic.com/)                         | v0.5.50  | 可视化内容编辑器                      |
| **Search**   | [Pagefind](https://pagefind.app/)                           | v1.4.0   | 静态搜索索引生成器                    |
| **Icons**    | [Lucide React](https://lucide.dev/)                         | v0.562.0 | 统一的 SVG 图标库                     |
| **Utility**  | [clsx](https://github.com/lukeed/clsx)                      | v2.1.1   | 动态类名拼接                          |
| **Utility**  | [tailwind-merge](https://github.com/dcastil/tailwind-merge) | v3.4.0   | Tailwind 类名冲突合并                 |
| **Deploy**   | [Cloudflare Pages](https://pages.cloudflare.com/)           | -        | 全球边缘节点托管                      |

---

## 📂 项目结构深度解析

```text
├── public/                 # 静态资源 (不经过构建处理)
│   ├── images/             # 图片存放目录
│   ├── robots.txt          # SEO 爬虫规则
│   └── sitemap-*.xml       # 自动生成的站点地图
├── scripts/                # 构建/开发辅助脚本
│   ├── check-mermaid-regression.mjs # Mermaid 回归检查
│   ├── clean-content.js    # 清理未使用的标签/分类
│   └── sync-content.js     # 手动全量内容同步
├── src/
│   ├── components/         # 组件库
│   │   ├── blog/           # 业务组件: Comments, TOC, ExportButton, Search...
│   │   ├── layout/         # 布局组件: Header
│   │   ├── mdx/            # MDX 自定义组件: Callout, Mermaid, Iframe
│   │   └── ui/             # 基础组件: Button, BackButton, Breadcrumbs...
│   ├── config/             # 站点配置文件
│   │   └── site.js         # 站点 URL、导航、评论、社交链接等
│   ├── content/            # 内容数据源 (Keystatic 管理)
│   │   ├── blog/           # .mdx 文章文件
│   │   ├── categories/     # 分类定义 (.json)
│   │   ├── friends/        # 友情链接定义 (.json)
│   │   ├── pages/          # 单页面内容 (about, friends)
│   │   ├── projects/       # 项目展示定义 (.json)
│   │   └── tags/           # 标签定义 (.json)
│   ├── content.config.ts   # Astro Content Collections 定义 (位于 src/ 根)
│   ├── layouts/            # 页面骨架
│   │   └── BaseLayout.astro # 基础 HTML 结构, SEO Meta, Theme Script
│   ├── lib/                # 工具函数 (图标映射、类名合并等)
│   ├── pages/              # 路由入口
│   │   ├── blog/[...slug].astro    # 文章详情页 (动态路由)
│   │   ├── categories/             # 分类列表/详情页
│   │   ├── tags/                   # 标签列表/详情页
│   │   ├── about.astro             # 关于我
│   │   ├── archives.astro          # 归档
│   │   ├── friends.astro           # 友链
│   │   ├── index.astro             # 首页
│   │   ├── projects.astro          # 项目展示
│   │   └── rss.xml.js              # RSS 生成逻辑
│   ├── plugins/            # 自定义 rehype 插件
│   ├── styles/             # 全局样式 (Tailwind v4 CSS-first 配置)
│   └── utils/              # 内容同步、阅读时间等工具
├── astro.config.mjs        # Astro 主配置文件 (集成插件配置)
├── components.json         # shadcn/ui 风格组件配置
├── keystatic.config.tsx    # Keystatic CMS 数据模型配置
└── package.json            # 依赖管理
```

---

## 🚀 开发指南 (Development Guide)

### 环境准备 (Prerequisites)

- **Node.js**: `v22.12.0` 或更高 (推荐 v22 LTS)
- **Package Manager**: 推荐使用 `pnpm` 或 `npm`

### 常用命令

| 命令                    | 说明                                                            |
| :---------------------- | :-------------------------------------------------------------- |
| `npm run dev`           | 启动本地开发服务器 (`localhost:4321`)，**开启内容自动同步监控** |
| `npm run build`         | 执行生产构建，并运行 Pagefind 索引生成                          |
| `npm run preview`       | 预览构建后的生产环境代码                                        |
| `npm run sync-content`  | 手动强制执行全量内容同步                                        |
| `npm run clean-content` | 清理未使用（无文章引用）的标签和分类定义                        |
| `npm run astro`         | 运行 Astro CLI 命令                                             |

### 撰写文章流程

1. **启动 CMS**: 运行 `npm run dev`，访问 `http://localhost:4321/keystatic`。
2. **可视化编辑**: 在后台创建新文章，支持实时预览。
3. **自动同步**:
   - 当您在文章中输入全新的 **标签** 或 **分类** 并保存时，后台会自动为您创建对应的定义文件。
   - 无需手动去“分类管理”或“标签管理”中再创建一遍。
4. **提交代码**: 将生成的 `.mdx` 和自动生成的 `tags/*.json` 文件 commit。

### 🏷️ 标签与分类管理自动化 (Automation Practice)

本项目引入了智能的内容同步机制，以平衡 Keystatic 的严格结构要求与写作的灵活性。

1.  **内容同步 (Content Sync)**:
    - 状态：`npm run dev` 运行时持续监控。
    - 行为：**只增不减**。当检测到文章使用了新标签，自动创建 `.json` 定义文件。删除文章**不会**自动删除标签（防止误删元数据）。
    - **手动全量同步**: `npm run sync-content`
      > 适用于 CI/CD 环境或当数据意外不同步时，强制全量扫描并生成缺失的标签/分类定义。

2.  **内容清理 (Content Cleanup)**:
    - 用于定期清理那些不再被任何文章引用的“僵尸标签”。
    - **预览模式**: `node scripts/clean-content.js --dry-run` (仅打印将要删除的文件，不执行删除)
    - **执行清理**: `npm run clean-content` (永久删除未使用的标签/分类文件)

---

## ⚙️ 配置手册 (Configuration)

### 1. 站点基本信息

站点核心信息集中在 `src/content/site/settings.json`（也可在 Keystatic 后台「站点设置」中可视化修改）：

- `name` / `description` / `author`: 站点名称、描述与作者，作为页面标题与 SEO 的默认值。
- `urls.primary` / `urls.githubPages`: 主域名与备用域名，`astro.config.mjs` 的 `site` 字段会通过 `src/config/site.js` 自动读取此处。

### 2. 调整 UI 主题

本项目使用 **Tailwind CSS v4** 的 CSS-first 配置，主题变量定义在 `src/styles/global.css` 中：

- `:root` / `.dark`: 修改 HSL 颜色变量。
- `@theme inline`: 将 CSS 变量映射为 Tailwind 工具类。
- `@plugin "tailwindcss-animate"` / `@plugin "@tailwindcss/typography"`: 注册动画与排版插件。
- 自定义排版、代码块、表格、动画等样式直接写在 `@layer base` 或普通 CSS 规则中。

### 3. 修改 CMS 字段

编辑 `keystatic.config.tsx` 可以增删 CMS 的字段模型：

- `collections`: 修改文章、分类的字段结构。
- `singletons`: 修改“关于我”等单页面的字段。

### 4. 评论系统配置

评论配置集中在 `src/content/site/settings.json` 的 `comments.giscus` 字段（也可在 Keystatic 后台「站点设置」中可视化修改），`src/components/blog/Comments.tsx` 会自动读取这些值：

```jsonc
{
  "comments": {
    "giscus": {
      "enabled": true,
      "repo": "username/repo", // 你的 GitHub 仓库
      "repoId": "R_kgDO...", // 仓库 ID
      "category": "Announcements", // Discussion 分类
      "categoryId": "DIC_kwDO...", // 分类 ID
      "mapping": "pathname", // 映射规则
    },
  },
}
```

---

## ☁️ 部署详解

本项目支持 **双平台部署**（Cloudflare Pages + GitHub Pages）：

- **Cloudflare Pages**：由 `astro.config.mjs` 中的 `@astrojs/cloudflare` adapter 支持，可用于生产环境的 SSR / Keystatic GitHub 登录。
- **GitHub Pages**：由 `.github/workflows/deploy.yml` 自动部署，作为备用节点。

### Cloudflare Pages 部署步骤

1. 登录 Cloudflare Dashboard，进入 **Workers & Pages**。
2. 创建应用 -> **Connect to Git** -> 选择本仓库。
3. **构建配置 (Build Settings)**:
   - **Framework Preset**: `Astro`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **环境变量 (Environment Variables)**:
   - 若需在生产环境启用 Keystatic 的 GitHub 模式，需在 Cloudflare Pages 配置：
     - `KEYSTATIC_GITHUB_CLIENT_ID`
     - `KEYSTATIC_GITHUB_CLIENT_SECRET`
     - `KEYSTATIC_SECRET` (生成方式: `openssl rand -base64 32`)
     - `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`
   - 建议额外设置 `NODE_VERSION=22.12.0`，与 `package.json` 的 Node 版本要求保持一致。

### GitHub Pages 部署步骤

1. 仓库 **Settings -> Pages -> Source** 选择 **GitHub Actions**。
2. 推送 `main` 分支后，`.github/workflows/deploy.yml` 会自动构建并部署。

> 提示：双部署模式下，Cloudflare Pages 承担主站功能（含 Keystatic 后台），GitHub Pages 作为静态备用节点。

### 常见问题

- **构建失败？** 检查 Node.js 版本设置，建议在 Cloudflare 环境变量中添加 `NODE_VERSION: 22.12.0`。
- **样式丢失？** 确保 `src/styles/global.css` 中的 `@source` 路径覆盖了所有模板文件。

---

## 📄 版权说明 (License)

本项目遵循 [MIT License](LICENSE) 开源协议。
文章内容版权归作者所有，默认采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 协议进行授权。

---

**Made with ❤️ by [CodeWolffy](https://github.com/CodeWolffy)**
