// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx(), sitemap()],
  site: 'https://codewolffy.github.io',

  vite: {
    plugins: [tailwindcss()]
  }
});