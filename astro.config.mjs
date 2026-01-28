// Astro 配置文件
import { defineConfig } from 'astro/config';
import path from 'path';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

// Import custom plugins
import { rehypeTableWrapper } from './src/plugins/rehype-table-wrapper.mjs';
import { rehypeVideoWrapper } from './src/plugins/rehype-video-wrapper.mjs';

// Import sync utility
import { syncContent } from './src/utils/content-sync.js';

// Auto-sync plugin
const autoSyncContent = () => {
  return {
    name: 'auto-sync-content',
    configureServer(server) {
      server.watcher.on('change', async (file) => {
        // Normalize path separators for Windows support
        const normalizedFile = file.split(path.sep).join('/');
        if (normalizedFile.includes('src/content/blog') && normalizedFile.endsWith('.mdx')) {
          console.log(`[AutoSync] Detected change in ${file}`);
          await syncContent(process.cwd());
        }
      });
      server.watcher.on('add', async (file) => {
        const normalizedFile = file.split(path.sep).join('/');
        if (normalizedFile.includes('src/content/blog') && normalizedFile.endsWith('.mdx')) {
          console.log(`[AutoSync] Detected new file ${file}`);
          await syncContent(process.cwd());
        }
      });
      server.watcher.on('unlink', async (file) => {
        const normalizedFile = file.split(path.sep).join('/');
        if (normalizedFile.includes('src/content/blog') && normalizedFile.endsWith('.mdx')) {
          console.log(`[AutoSync] Detected deleted file ${file}`);
          await syncContent(process.cwd());
        }
      });
    }
  }
};

// https://astro.build/config
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
export default defineConfig({
  // 路由预加载配置 - 提升导航性能
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  // Cloudflare Pages 支持 SSR，所以 Keystatic 可以在生产环境运行
  integrations: [
    react(),
    mdx({
      rehypePlugins: [rehypeTableWrapper],
    }),
    sitemap({
      // 过滤掉不需要索引的页面
      filter: (page) =>
        !page.includes('/keystatic') &&
        !page.includes('/api/') &&
        !page.includes('/search'),
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
    keystatic()
  ],
  // 部署到 Cloudflare Pages 后，请更新为你的实际域名
  site: isGitHubActions ? 'https://codewolffy.github.io' : 'https://codewolffy.pages.dev',

  // Markdown 代码高亮配置
  markdown: {
    rehypePlugins: [rehypeTableWrapper],
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
    plugins: [
      tailwindcss(),
      autoSyncContent() // Register the plugin
    ],
    build: {
      // 使用 esbuild 压缩（比 terser 快 20-40 倍）
      minify: 'esbuild',
      // 手动分包优化
      rollupOptions: {
        output: {
          // manualChunks: {
          //   vendor: ['react', 'react-dom'],
          //   icons: ['lucide-react'],
          // }
        }
      }
    },

  },
  // Astro 5: static 模式默认支持混合渲染，Keystatic 页面会自动使用 SSR
  adapter: cloudflare(),
});
