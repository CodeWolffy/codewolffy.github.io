import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPatch, parsePatch, reversePatch } from 'diff';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedVersion = '0.6.9';
const packageDir = join(rootDir, 'node_modules', '@keystatic', 'core');
const installedPackage = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));

if (installedPackage.version !== expectedVersion) {
  throw new Error(
    `[keystatic-patch] Expected @keystatic/core ${expectedVersion}, found ${installedPackage.version}. Update the editor patch before upgrading.`
  );
}

const targetPath = 'node_modules/@keystatic/core/dist/index-3c244051.js';
const patchPath = join(rootDir, 'patches', `@keystatic+core+${expectedVersion}.patch`);
const normalizeNewlines = (source) => source.replace(/\r\n/g, '\n');
const patches = parsePatch(normalizeNewlines(readFileSync(patchPath, 'utf8')));

if (
  patches.length !== 1 ||
  patches[0].oldFileName !== `a/${targetPath}` ||
  patches[0].newFileName !== `b/${targetPath}`
) {
  throw new Error(`[keystatic-patch] Unexpected patch target in ${patchPath}.`);
}

const targetFile = join(rootDir, targetPath);
const source = normalizeNewlines(readFileSync(targetFile, 'utf8'));
const patch = patches[0];
const patched = applyPatch(source, patch);

if (patched === false) {
  const original = applyPatch(source, reversePatch(patch));

  if (original === false || applyPatch(original, patch) !== source) {
    throw new Error('[keystatic-patch] Editor patch does not match the installed source.');
  }

  console.log(`[keystatic-patch] @keystatic/core ${expectedVersion} is already patched.`);
} else {
  writeFileSync(targetFile, patched);
  console.log(`[keystatic-patch] Applied editor fixes to @keystatic/core ${expectedVersion}.`);
}
