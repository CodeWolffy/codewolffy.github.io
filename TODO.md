# TODO — 狼码纪博客项目待完善清单

> 生成日期：2026-05-25 | 最后更新：2026-05-25

---

## ✅ 已完成

- [x] **实现 Service Worker（PWA 离线支持）**  
       `manifest.json` 与 `public/sw.js` 已配置，并在 `BaseLayout.astro` 中完成注册。采用静态资源 Cache First + 页面 Network First + `/offline/` 回退策略。

---

## 📝 内容层面建议

- [ ] **增加文章数量**  
       目前仅 7 篇已发布文章，搜索引擎收录和 RSS 订阅价值有限。

- [ ] **补充项目展示内容**  
       `src/content/projects/` 下目前仅一个项目条目，项目页较空。

- [ ] **完善 About 页面**  
       确认技能列表、社交链接是否与 `src/config/site.js` 中的 `socials` 保持一致。
