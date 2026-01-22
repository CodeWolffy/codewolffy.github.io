// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Cloudflare Pages 支持 SSR，所以 Keystatic 可以在生产环境运行
  integrations: [react(), mdx(), sitemap(), keystatic()],
  // 部署到 Cloudflare Pages 后，请更新为你的实际域名
  site: 'https://codewolffy-github-io.pages.dev',

  vite: {
    plugins: [tailwindcss()]
  },
  // Astro 5: static 模式默认支持混合渲染，Keystatic 页面会自动使用 SSR
  adapter: cloudflare(),
});