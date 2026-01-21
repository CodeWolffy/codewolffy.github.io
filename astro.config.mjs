// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';

const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('build');

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx(), sitemap(), keystatic()],
  site: 'https://codewolffy.github.io',

  vite: {
    plugins: [tailwindcss()]
  },
  // 始终使用 static 模式以支持 GitHub Pages
  output: 'static'
});