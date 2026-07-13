import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const failures = [];

function walk(directory, extensions) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return walk(file, extensions);
    return extensions.has(extname(entry.name)) ? [file] : [];
  });
}

for (const file of walk(resolve(root, 'src'), new Set(['.astro']))) {
  const source = readFileSync(file, 'utf8');
  const stack = [];
  const tags = source.matchAll(/<(\/)?(a|Button)\b[^>]*>/g);

  for (const match of tags) {
    const closing = Boolean(match[1]);
    const tag = match[2];
    if (closing) {
      const index = stack.findLastIndex((entry) => entry.tag === tag);
      if (index >= 0) stack.splice(index, 1);
      continue;
    }

    const buttonParent = stack.findLast((entry) => entry.tag === 'Button');
    const invalidNesting =
      (tag === 'Button' && stack.some((entry) => entry.tag === 'a')) ||
      (tag === 'a' && buttonParent && !buttonParent.asChild);
    if (invalidNesting) {
      const line = source.slice(0, match.index).split('\n').length;
      failures.push(`${relative(root, file)}:${line} nests a link and a button`);
    }
    if (!/\/>\s*$/.test(match[0])) {
      stack.push({ tag, asChild: tag === 'Button' && /\basChild\b/.test(match[0]) });
    }
  }
}

for (const file of walk(resolve(root, 'src/content/blog'), new Set(['.mdx']))) {
  const source = readFileSync(file, 'utf8').replace(/^---[\s\S]*?---\s*/m, '');
  let inFence = false;
  let previousDepth = 1;

  source.split('\n').forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const heading = /^(#{1,6})\s+/.exec(line);
    if (!heading) return;
    const depth = heading[1].length;
    const sourceLine = index + 1;

    if (depth === 1) {
      failures.push(`${relative(root, file)}:${sourceLine} duplicates the page-level H1`);
    }
    if (depth > previousDepth + 1) {
      failures.push(
        `${relative(root, file)}:${sourceLine} jumps from H${previousDepth} to H${depth}`
      );
    }
    previousDepth = depth;
  });
}

if (failures.length > 0) {
  console.error('Content accessibility regression check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Content accessibility regression check passed.');
