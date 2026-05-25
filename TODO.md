# TODO — 狼码纪博客项目待完善清单

> 生成日期：2026-05-25 | 最后更新：2026-05-25

---

## 🟠 中优先级

- [ ] **实现 Service Worker（PWA 离线支持）**  
  `manifest.json` 已完善，但缺少 Service Worker 导致无法真正离线安装。推荐安装 `@vite-pwa/astro` 插件，配置静态资源永久缓存 + 文章页 Network First 策略。注意缓存更新机制，避免用户看到旧内容。

---

## 📝 内容层面建议

- [ ] **增加文章数量**  
  目前仅 7 篇已发布文章，搜索引擎收录和 RSS 订阅价值有限。

- [ ] **补充项目展示内容**  
  `src/content/projects/` 下目前仅一个项目条目，项目页较空。

- [ ] **完善 About 页面**  
  确认技能列表、社交链接是否与 `src/config/site.js` 中的 `socials` 保持一致。
