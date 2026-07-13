import { existsSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const distRoot = resolve(process.cwd(), 'dist');
const legacyImages = [
  'images/posts/java-static-method/coverImage.png',
  'images/posts/for-foreach/coverImage.png',
  'images/posts/dataschema/coverImage.png',
  'images/posts/best-8-mcp-servers-for-developers/coverImage.png',
];

let removed = 0;
for (const outputRoot of [distRoot, join(distRoot, 'client')]) {
  for (const relativePath of legacyImages) {
    const target = resolve(outputRoot, relativePath);
    if (!target.startsWith(`${resolve(outputRoot)}${sep}`)) {
      throw new Error(`Refusing to remove asset outside build output: ${target}`);
    }
    if (!existsSync(target)) continue;
    rmSync(target, { force: true });
    removed += 1;
  }
}

console.log(`[assets] Removed ${removed} unreferenced legacy image master(s) from dist.`);
