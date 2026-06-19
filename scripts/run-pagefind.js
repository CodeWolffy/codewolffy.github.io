import { existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const distDir = resolve(process.cwd(), 'dist');
const clientDir = resolve(distDir, 'client');

// Cloudflare adapter outputs static assets to dist/client;
// static-only builds (GitHub Pages) keep assets directly in dist.
const siteDir = existsSync(clientDir) ? clientDir : distDir;

console.log(`[pagefind] Indexing ${siteDir}`);
execSync(`npx pagefind --site "${siteDir}"`, { stdio: 'inherit' });
