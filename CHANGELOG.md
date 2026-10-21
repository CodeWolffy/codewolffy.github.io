# 更新日志

> 格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)

---

## [Unreleased]

### 依赖

- 升级 Astro 7.4.1、Cloudflare 适配器 14.4.1、MDX 8.1.0、React 集成 7.1.0 和 React / React DOM 19.3.1。
- 升级 Mermaid 12.2.0、Lucide React 1.61.0、Radix UI、ESLint 和 Prettier 等依赖，同步 Pagefind 1.5.2 的版本声明，并刷新锁文件中的间接依赖。
- 将构建 Node.js 统一为 22.23.3 LTS，并按照新版 Astro ESLint 插件的要求更新 `engines.node`。
- 保留 TypeScript 5.9.3，等待 Astro 检查工具与 TypeScript ESLint 支持 TypeScript 7；固定 Keystatic Core 0.6.9 以匹配现有编辑器补丁。

### 文档

- 同步 README 与当前项目结构、脚本、功能（新增音乐播放器说明、补充 `src/content/music/` 与 `src/components/music/`、更新 Node.js 版本说明等）
- 补充 `settings.json` 配置说明：导航、社交链接、站点验证、不蒜子统计、界面文案、音乐库管理

### 修复

- 显式声明 Markdown 处理器和自定义 rehype 插件的依赖，适配新版 Astro 的可选 Markdown 处理器安装方式。
- 将 Tailwind Typography 的 `postcss-selector-parser` 覆盖为安全版本 7.1.7。
- 保留 Mermaid 12 的 dagre / classic 图表风格，并为 Keystatic SVG 预览显式关闭顶层 HTML 标签，修复带 `<br>` 换行的图表预览失败。
- 适配新版 Astro ESLint 和 Prettier 配置，更新 Astro 模板格式，并让格式检查兼容本地与 CI 的换行符。
- 修正 1.0.0 中关于 projects Schema 字段合并的描述：当前代码与数据仍保留 `image` 字段作为 `coverImage` 的兼容回退

---

## [1.0.0] — 2026-05-25

### 优化

- 将 OG 分享图（`default-share.png`）转为 JPEG，体积从 5MB 降至 58KB
- 重新生成 `favicon.ico`，采用 PNG-in-ICO 格式，体积从 457KB 降至 7.8KB
- 修复 `icon` 配置，生成正确尺寸的 192x192 和 512x512 图标
- 修正 `package.json` 依赖分类：`@astrojs/check` 移至 `devDependencies`
- 移除未使用的 `@astrojs/markdoc` 依赖
- 合并 `projects` Schema 冗余字段（`image` → `coverImage`）
- 更新 GitHub Actions 工作流，固定 Node.js v22
- 修复 `BaseLayout.astro` favicon 链接引用
- 移除 `robots.txt` 中无效的 `/search` 禁爬规则

### 新增

- 技术栈版本升级（Astro 5.18.1、Tailwind CSS 4.1.18、TypeScript 5.9.3 等）

---

## [0.9.0] — 2026-03-04

### 新增

- 归档页面增加文章数量统计功能

### 修复

- 修复 Mermaid 图渲染问题（E-R 图）

---

## [0.8.0] — 2026-02-02

### 优化

- 优化 Mermaid 图的显示与导出
- 移动端页面内容贴近导航栏显示优化

---

## [0.7.0] — 2026-01-29

### 新增

- 归档页新增折叠按钮
- 归档页面重大优化，同步适配博客后台

### 优化

- 增加页面过渡动画，优化移动端体验
- 表格适配移动端
- 优化文章推荐算法
- 首页页面布局优化

### 修复

- 修复 Mermaid 图渲染问题
- 表格样式修复

---

## [0.6.0] — 2026-01-28

### 新增

- Mermaid 图表支持
- 不蒜子访问量统计
- 标签云
- 路由预加载（Prefetch）
- 封面图懒加载
- 阅读时间估算
- Open Graph 与社交分享优化
- CSP 安全头强制模式

### 优化

- 优化面包屑导航
- 优化图标支持
- 移动端状态栏显示优化

---

## [0.5.0] — 2026-01-26

### 新增

- 编辑此页快捷入口
- CMS 后台视频嵌入代码提示与格式检测

### 优化

- 导出文件中视频高度修复
- 安全配置增强（更严格 CSP 策略）
- 移动端导出按钮宽度优化

---

## [0.4.0] — 2026-01-24

### 优化

- 提升系统健壮性
- 修复手机端评论区卡屏问题
- 修复构建失败问题

---

## [0.3.0] — 2026-01-23

### 新增

- 友链排序功能
- 文章打印功能
- PDF 导出支持
- 多平台分享按钮
- Vite 构建分包优化（`manualChunks`）

---

## [0.2.0] — 2026-01-22

### 新增

- Keystatic GitHub App 集成
- Cloudflare Pages 部署配置

---

## [0.1.0] — 2026-01-20

### 新增

- 博客初始版本上线
- 基础路由、文章列表、分类标签系统
- 暗色模式（无闪烁）
- 移动端响应式布局
- Pagefind 全文搜索
- Giscus 评论系统（基于 GitHub Discussions）
- RSS 订阅支持
- 自动 Sitemap 生成
