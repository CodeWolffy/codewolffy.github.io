# 更新日志

> 格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)

---

## [1.0.0] — 2026-05-25

### 优化
- 将 OG 分享图（`default-share.png`）转为 JPEG，体积从 5MB 降至 58KB
- 重新生成 `favicon.ico`，采用 PNG-in-ICO 格式，体积从 457KB 降至 7.8KB
- 修复 `manifest.json` PWA 图标配置，生成正确尺寸的 192x192 和 512x512 图标
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
