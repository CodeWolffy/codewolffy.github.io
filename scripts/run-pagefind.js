import { existsSync } from 'fs';
import { resolve } from 'path';
import { packageBinary, runNode } from './lib/commands.mjs';

const distDir = resolve(process.cwd(), 'dist');
const clientDir = resolve(distDir, 'client');

// Both packaged targets use dist; also accept a raw adapter output for manual diagnostics.
const siteDir = existsSync(clientDir) ? clientDir : distDir;

console.log(`[pagefind] Indexing ${siteDir}`);
runNode([packageBinary('pagefind'), '--site', siteDir]);
