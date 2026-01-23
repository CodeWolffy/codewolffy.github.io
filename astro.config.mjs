// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
export default defineConfig({
  // Cloudflare Pages 支持 SSR，所以 Keystatic 可以在生产环境运行
  integrations: [react(), mdx(), sitemap(), keystatic()],
  // 部署到 Cloudflare Pages 后，请更新为你的实际域名
  site: isGitHubActions ? 'https://codewolffy.github.io' : 'https://codewolffy.pages.dev',

  // Markdown 代码高亮配置
  markdown: {
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
    plugins: [tailwindcss()]
  },
  // Astro 5: static 模式默认支持混合渲染，Keystatic 页面会自动使用 SSR
  adapter: cloudflare(),
});