# TODO — 狼码纪博客项目待完善清单

> 生成日期：2026-05-25 | 最后更新：2026-05-25（中优先级全部完成）  
> 基于对项目全面审查，按优先级分类整理。

---

## 🔴 高优先级（影响性能/安全/正确性）

### 静态资源优化

- [x] **压缩 `public/default-share.png`（原 5MB）**  
  ✅ 已转换为 JPEG 格式（`default-share.jpg`），1200×630px，58KB（降幅 98.8%）。同步更新 `src/config/site.js` 引用。

- [x] **压缩 `public/favicon.ico`（原 457KB）**  
  ✅ 已用 `favicon.png` 重新生成，采用现代 PNG-in-ICO 格式嵌入 16/32/48px 三个尺寸，新文件 7.8KB（降幅 98.3%）。

- [x] **修复 `manifest.json` 图标配置**  
  ✅ 已生成 `icon-192x192.png`（23KB）和 `icon-512x512.png`（54KB），更新 manifest 引用正确文件和尺寸，修复了重复的 192x192 条目。

  ```json
  // 现状（有误）
  { "src": "/favicon.png", "sizes": "192x192" }
  { "src": "/favicon.png", "sizes": "512x512" }  // 实际是同一张图
  { "src": "/favicon.png", "sizes": "192x192", "purpose": "maskable" }  // 重复
  ```

### 依赖分类错误

- [x] **将 `@astrojs/check` 从 `dependencies` 移入 `devDependencies`**  
  ✅ 已修正。

- [x] **确认 `@astrojs/markdoc` 是否实际使用**  
  ✅ 确认未使用，已从 `dependencies` 中删除。

### 内容 Schema 不一致

- [x] **清理 `content/config.ts` 中的双字段冗余**
  - `friends` collection 的 `avatar`（本地路径）和 `avatarUrl`（外链）经审查为 **Keystatic CMS 有意设计**（两种上传方式），保留不变。
  - ✅ `projects` collection 已移除冗余的 `image` 字段，统一为 `coverImage`；同步更新了 `my-tech-blog11.json` 数据和 `projects.astro` 模板。

---

## 🟠 中优先级（体验/规范/可维护性）

### CI/CD 完善

- [x] **为 GitHub Actions 工作流指定 Node.js 版本**  
  ✅ `deploy.yml` 已添加 `node-version: 22`。

- [x] **为 GitHub Actions 添加依赖缓存**  
  ✅ `withastro/action@v2` 内置 npm 缓存，指定 `node-version` 后已生效，无需额外步骤。

- [x] **补充 Cloudflare Pages 的 CI/CD 配置**  
  ✅ 确认 Cloudflare Pages 已直接连接 GitHub 仓库自动部署，无需额外 workflow。

### 缺失 `.env.example` 文件

- [x] **在项目根目录创建 `.env.example`**  
  ✅ 已创建，包含三个 Keystatic 必要环境变量及生成命令说明。

### 测试文件清理

- [x] **移除或归档根目录 `test_regex.js`**  
  ✅ 已移至 `scripts/test_regex.js`。

- [ ] **处理 `src/content/blog/test1.mdx` 草稿**  
  用户确认保留作为开发测试 fixture。

### PWA 服务工作者

- [ ] **实现 Service Worker**  
  `manifest.json` 已完善，但缺少 Service Worker 导致无法真正离线安装。可使用 Workbox 或 VitePWA 插件。

- [x] **将 `version` 从 `0.0.1` 更新为语义化版本**  
  ✅ 已更新至 `1.0.0`。

---

## 🟡 低优先级（SEO/文档/代码质量）

### SEO 优化

- [ ] **清理 `siteConfig.verification.google` 中的重复 token**  
  `src/config/site.js` 中有两个 Google Search Console 验证 token，通常只需要一个。请确认哪个仍有效后手动移除另一个。

- [x] **为文章页添加 JSON-LD 结构化数据**  
  ✅ 已存在（`blog/[...slug].astro` 第 113-140 行），包含完整的 `BlogPosting` schema。

- [x] **`robots.txt` 中 `/search` 禁止规则评估**  
  ✅ 确认项目无 `/search` 路由，已移除该无效规则。

### 文档补充

- [x] **创建 `CHANGELOG.md`**  
  ✅ 已从 git log 整理并创建，覆盖 v0.1.0 至 v1.0.0 全部版本历史。

- [x] **更新 README 中的技术栈版本表**  
  ✅ 已更新 Astro（v5.16.11 → v5.18.1）和 Vite（v6.4.1 → v6.4.2）。

### 代码质量

- [ ] **将 `scripts/` 目录中的 `.js` 脚本迁移至 TypeScript**  
  `content-sync.js`、`clean-content.js`、`sync-content.js` 均为纯 JS，失去类型保护。可使用 `tsx` 或 `ts-node` 运行 `.ts` 脚本。

- [ ] **`dev` 脚本添加内容自动同步**  
  `build` 脚本有 mermaid 检查但 `dev` 没有启动时同步钩子，需要手动跑 `sync-content`。可在 `dev` 改为 `astro dev & node scripts/sync-content.js --watch`（或 concurrently）。

### 无障碍访问（Accessibility）

- [x] **检查全站 `<img>` 标签的 `alt` 属性**  
  ✅ 经全库扫描，所有 `<img>` 标签均已正确设置 `alt` 属性。

- [ ] **验证键盘导航可用性**  
  需在浏览器中手动测试：移动端菜单、TOC 折叠、搜索对话框、代码复制按钮等组件的 Tab/Enter/Escape 可访问性。

---

## 📝 内容层面建议

- [ ] **增加文章数量**  
  目前仅 7 篇已发布文章，内容较少，搜索引擎收录和 RSS 订阅价值有限。

- [ ] **补充项目展示内容**  
  `src/content/projects/` 下目前仅一个项目条目，项目页较空，可补充更多实际项目。

- [ ] **完善 About 页面**  
  审查 `about.mdx` 内容是否充实，包括技能列表、社交链接是否与 `site.js` 中的 `socials` 保持一致。

---

## 统计摘要

| 类别 | 数量 |
|------|------|
| 高优先级问题 | ~~5~~ 0（全部完成）|
| 中优先级问题 | ~~7~~ 1（Service Worker 待实现）|
| 低优先级问题 | ~~8~~ 3（Google token / 键盘导航 / scripts TS 迁移）|
| 内容建议 | 3 |
| **合计** | **23** |
