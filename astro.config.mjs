// Astro 配置文件
import { defineConfig, sessionDrivers } from 'astro/config';
import path from 'path';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import keystatic from '@keystatic/astro';
import { getSiteUrl, siteConfig } from './src/config/site.js';
import { getDeployTarget } from './src/config/deploy-target.mjs';
import { createSitemapPolicy } from './src/utils/sitemap-policy.ts';
import { generatePostOptions } from './scripts/generate-post-options.mjs';
import { generateAvatarImages } from './scripts/generate-avatar-images.mjs';

// Import custom plugins
import { rehypeTableWrapper } from './src/plugins/rehype-table-wrapper.mjs';

// Import sync utility
import { syncContent } from './src/utils/content-sync.ts';

// Auto-sync plugin
function formatAutoSyncError(error) {
  return error instanceof Error ? error.message : String(error);
}

const autoSyncContent = () => {
  return {
    name: 'auto-sync-content',
    configureServer(server) {
      let timer;
      let running = false;
      let stopped = false;
      let postsPending = false;
      let avatarsPending = false;
      const flush = async () => {
        if (running || stopped) return;
        running = true;
        try {
          // File saves can arrive during generation. Process the latest state before exiting.
          while (!stopped && (postsPending || avatarsPending)) {
            const posts = postsPending;
            const avatars = avatarsPending;
            postsPending = false;
            avatarsPending = false;
            if (posts) {
              await syncContent(process.cwd());
              await generatePostOptions(process.cwd());
            }
            if (avatars) await generateAvatarImages(process.cwd());
          }
        } catch (error) {
          server.config.logger.error(`[AutoSync] ${formatAutoSyncError(error)}`);
        } finally {
          running = false;
        }
      };
      const onFile = (file) => {
        const name = path.relative(process.cwd(), file).split(path.sep).join('/');
        if (/^src\/content\/blog\/.*\.mdx?$/.test(name)) postsPending = true;
        if (
          name === 'src/content/pages/about.mdx' ||
          /^src\/content\/friends\/.*\.json$/.test(name) ||
          (name.startsWith('public/images/') &&
            !name.startsWith('public/images/generated/avatars/'))
        )
          avatarsPending = true;
        if (!postsPending && !avatarsPending) return;
        clearTimeout(timer);
        timer = setTimeout(() => void flush(), 300);
      };
      for (const event of ['change', 'add', 'unlink']) server.watcher.on(event, onFile);
      server.httpServer?.once('close', () => {
        stopped = true;
        clearTimeout(timer);
        for (const event of ['change', 'add', 'unlink']) server.watcher.off(event, onFile);
      });
    },
  };
};

// https://astro.build/config
// Deployment is explicit so both targets can be checked in any CI provider.
const deployTarget = getDeployTarget(process.env.DEPLOY_TARGET);
const isGitHubPages = deployTarget === 'github';
const isBuild = process.argv.includes('build');
const isPreview = process.argv.includes('preview');
const isDev = process.argv.includes('dev');
const enableCloudflareAdapter = (isBuild || isPreview) && !isGitHubPages;
const enableKeystatic = !isGitHubPages;
const sitemapPolicy = await createSitemapPolicy({
  contentDirectory: path.resolve('src/content/blog'),
  primarySiteUrl: siteConfig.urls.primary,
});

export default defineConfig({
  session: {
    driver: sessionDrivers.memory(),
  },
  // 路由预加载配置 - 仅预加载视口内/悬停的链接，避免全量预加载浪费带宽
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  // Cloudflare Pages 支持 SSR，所以 Keystatic 可以在生产环境运行
  integrations: [
    react(),
    mdx(),
    sitemap({
      // 过滤掉不需要索引的页面
      filter: sitemapPolicy.filter,
      // 自定义 sitemap 条目
      serialize(item) {
        item.url = sitemapPolicy.canonicalize(item.url);
        const url = item.url;
        // 获取路径部分（去除域名）
        const path = new URL(url).pathname;

        // 首页：最高优先级（只匹配根路径 /）
        if (path === '/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
          return item;
        }

        // 博客文章：高优先级
        if (path.startsWith('/blog/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
          return item;
        }

        // 分类和标签页：中等优先级
        if (path.startsWith('/categories/') || path.startsWith('/tags/')) {
          item.priority = 0.6;
          item.changefreq = 'weekly';
          return item;
        }

        // 其他页面（关于、归档、友链等）
        item.priority = 0.5;
        item.changefreq = 'monthly';
        return item;
      },
    }),
    ...(enableKeystatic ? [keystatic()] : []),
  ],
  adapter: enableCloudflareAdapter
    ? cloudflare({
        // The root wrangler.toml targets Cloudflare Pages. The adapter uses
        // the Workers Vite plugin internally, so it needs a Workers-only
        // config without pages_build_output_dir during the Astro build.
        configPath: 'wrangler.astro.toml',
        imageService: 'compile',
        prerenderEnvironment: 'node',
      })
    : undefined,
  site: getSiteUrl({ isGitHubActions: isGitHubPages }),

  // Markdown 代码高亮配置
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeTableWrapper],
    }),
    shikiConfig: {
      // 使用双主题支持亮/暗模式 - 使用 One Dark 主题（VS Code 经典）
      themes: {
        light: 'one-light',
        dark: 'one-dark-pro',
      },
      // 启用代码块换行
      wrap: true,
      // 添加自定义 transformer 为代码块添加语言属性
      transformers: [
        {
          pre(node) {
            // 为 pre 元素添加 data-language 属性
            node.properties['data-language'] = this.options.lang || '';
          },
        },
      ],
    },
  },

  vite: {
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    optimizeDeps: {
      force: isDev,
      include: ['slate-react', 'lodash/debounce', 'lodash/throttle'],
      exclude: [
        '@keystatic/astro',
        '@keystatic/astro/internal/keystatic-api.js',
        '@keystatic/astro/internal/keystatic-page.js',
        'astro/virtual-modules/transitions.js',
        'astro/virtual-modules/transitions-router.js',
        'astro/virtual-modules/transitions-types.js',
        'astro/virtual-modules/transitions-events.js',
        'astro/virtual-modules/transitions-swap-functions.js',
      ],
      rolldownOptions: {
        external: ['virtual:keystatic-config', 'astro:toolbar:internal'],
      },
    },
    ssr: {
      resolve: {
        dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      },
    },
    plugins: [
      tailwindcss(),
      autoSyncContent(), // Register the plugin
    ],
    build: {
      // 使用 esbuild 压缩（比 terser 快 20-40 倍）
      minify: 'esbuild',
    },
  },
  // Astro 7 中 static 输出会预渲染前台页面；
  // Cloudflare adapter 负责承载 Keystatic 后台的 SSR 路由。
  output: 'static',
  // Keep adapter internals outside the public Pages directory.
  outDir: isGitHubPages ? './dist' : './.astro/cloudflare-build',
});
