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
import { getSiteUrl } from './src/config/site.js';

// Import custom plugins
import { rehypeTableWrapper } from './src/plugins/rehype-table-wrapper.mjs';

// Import sync utility
import { syncContent } from './src/utils/content-sync.ts';

// Auto-sync plugin
function formatAutoSyncError(error) {
  return error instanceof Error ? error.message : String(error);
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void fn(...args).catch((error) => {
        console.error(`[AutoSync] ${formatAutoSyncError(error)}`);
      });
    }, delay);
  };
}

const autoSyncContent = () => {
  const sync = debounce(async (file, eventType) => {
    await syncContent(process.cwd());
    console.log(`[AutoSync] Synced after ${eventType}: ${file}`);
  }, 300);

  return {
    name: 'auto-sync-content',
    configureServer(server) {
      const handleFileEvent = (eventType) => async (file) => {
        // Normalize path separators for Windows support
        const normalizedFile = file.split(path.sep).join('/');
        if (normalizedFile.includes('src/content/blog') && normalizedFile.endsWith('.mdx')) {
          sync(file, eventType);
        }
      };

      server.watcher.on('change', handleFileEvent('change'));
      server.watcher.on('add', handleFileEvent('add'));
      server.watcher.on('unlink', handleFileEvent('unlink'));
    },
  };
};

// https://astro.build/config
// GitHub Actions 输出纯静态站点；其他构建目标启用 Cloudflare adapter，
// 保留 Keystatic 后台所需的 SSR 路由能力。
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const isBuild = process.argv.includes('build');
const isPreview = process.argv.includes('preview');
const enableCloudflareAdapter = (isBuild || isPreview) && !isGitHubActions;
const enableKeystatic = !isGitHubActions;

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
      filter: (page) =>
        !page.includes('/keystatic') && !page.includes('/api/') && !page.includes('/search'),
      // 自定义 sitemap 条目
      serialize(item) {
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
        imageService: 'compile',
      })
    : undefined,
  site: getSiteUrl({ isGitHubActions }),

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
      esbuildOptions: {
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
  // Astro 6 中 static 输出会预渲染前台页面；
  // Cloudflare adapter 负责承载 Keystatic 后台的 SSR 路由。
  output: 'static',
});
