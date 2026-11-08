# 性能预算与浏览器验证

预算来自 `src/config/asset-budgets.json`，用于阻止静态资源明显退化。它们是项目门禁，不等于真实用户的 Core Web Vitals 或 Lighthouse 分数。

| 项目        | 限额         | 统计范围                                                      |
| ----------- | ------------ | ------------------------------------------------------------- |
| 单张图片    | 1,500,000 B  | `public/images`，已明确剔除的历史大图原稿除外                 |
| 图片总量    | 12,000,000 B | 同上，含生成头像                                              |
| 单个音频    | 25 MiB       | 上传检查与构建检查使用相同阈值                                |
| 音频总量    | 160 MiB      | `public/music`                                                |
| 单页 HTML   | 300 KiB      | 构建后的原始 HTML                                             |
| 首批外部 JS | 180 KiB gzip | script/modulepreload、load/idle 岛屿及其静态导入，按 URL 去重 |
| 单页 CSS    | 40 KiB gzip  | HTML 引用的本地样式表                                         |

首批 JS 不包含用户操作后才加载的搜索、可见时才加载的评论/导出、动态导入的图表库，也不包含外部统计服务。构建检查不会将 CMS 最大 chunk 错算为博客首页首屏流量。CSS/JS 使用逐文件 gzip 大小，实际 CDN 采用 Brotli 时传输体积可能更小。

## 本地验证

```sh
npm ci
npm run prepare-content
npm run check:all
npm run build:github
npx playwright install chromium
npm run test:browser
npm run build:cloudflare
npm run test:browser
```

`npm run build` 默认 Cloudflare，也可通过 `DEPLOY_TARGET` 选择目标。每次构建都会检查预算；完整构建成功后才更新 `.astro/build-target.json`。`npm run preview` 自动选择对应服务，Cloudflare 使用真实 Pages worker 与响应头。

构建报告保存在 `.astro/build-budget-report.json`，包含所有静态页面的 HTML、首批 JS、CSS 指标及最重页面。浏览器 HTML 报告位于 `playwright-report/index.html`。

## 桌面与手机基线

CI 使用 Chromium，分别检查 1280×900 桌面视口和 390×844、DPR 2 手机视口。每个测试使用独立上下文；首页测试记录 LCP、CLS、资源 transferSize/decodedBodySize、头像实际 URL 和横向溢出情况，作为报告附件保存 14 天。

这些是未模拟弱网或 CPU 降速的本地/CI 实验数据。第三方评论、统计和社交请求在自动测试中被阻止，不能将报告数字当成线上移动网络或 Safari 的性能结论。上线后可另行采集真实用户指标，或以固定网络和 CPU 条件运行 Lighthouse。

首次优化前：首页头像使用 4096×4096 JPEG，764,561 B。当前三个重复来源共用一套按内容哈希命名的响应式资源，96px AVIF 为 1,614 B，192px AVIF 为 3,037 B。修改 CMS 头像来源后，`prepare-content` 或本地开发监听会重新生成资源；重复执行不改写相同文件。

2026-11-08 本地 Cloudflare Pages 产物抽测：桌面 1280×720（DPR 1.25）下载 192px AVIF 3,037 B，手机 390×844（DPR 1）下载 96px AVIF 1,614 B；两种视口均未见横向溢出，采样时 CLS 为 0。禁用浏览器缓存但未模拟弱网/CPU，不能把此次本地速度当成线上性能保证。最终 Cloudflare 构建预算中，最重页面首批 JS 为 123,709 B gzip，CSS 为 22,613 B gzip。

2026-11-08 提交前完成了 95 个 Node 单测、完整质量检查及两种目标的构建。实际执行 Playwright 套件：Cloudflare 15 项通过、1 项跳过；GitHub Pages 13 项通过、3 项跳过。跳过项分别为手机视口不适用的桌面播放器快捷键组合，以及 GitHub Pages 不提供的 CMS/音频 worker 场景。新增组合用例先复现播放器抢占搜索 Escape，再验证修复后的焦点与关闭行为。

隔离临时目录中的 `npm ci` 冷安装已通过，Keystatic 补丁从干净依赖成功应用，依赖审计为 0 告警；现有开发进程不受影响。Playwright 报告和测试产物已同时从 Git、格式、Lint 与类型检查中排除，运行浏览器测试后可以继续执行 `check:all`。

浏览器回归同时验证生产搜索与跨页重开、Mermaid 真实 SVG 渲染/主题切换、全屏焦点限制、手机菜单/播放器关闭后的滚动恢复、标签动画上限和主域 canonical。图表异步竞争和音乐 HTTP 协议边界另有可控异步单测覆盖。
