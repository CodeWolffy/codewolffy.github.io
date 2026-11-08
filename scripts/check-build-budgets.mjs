import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import budgets from '../src/config/asset-budgets.json' with { type: 'json' };
import { createPageAssetMeasurer } from './lib/build-budgets.mjs';

const dist = resolve('dist');
const root = existsSync(join(dist, 'client')) ? join(dist, 'client') : dist;
if (!existsSync(join(root, 'index.html')))
  throw new Error('Build the site before checking page budgets.');
const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : file.endsWith('.html') ? [file] : [];
  });
const measure = await createPageAssetMeasurer(root);
const pages = walk(root).map((file) => {
  const path = relative(root, file).replaceAll('\\', '/');
  return { path, ...measure(readFileSync(file, 'utf8'), path) };
});
const limits = {
  htmlBytes: budgets.maxHtmlFileBytes,
  initialJavaScriptGzipBytes: budgets.maxInitialJavaScriptGzipBytes,
  stylesheetGzipBytes: budgets.maxStylesheetGzipBytes,
};
const failures = [];
for (const page of pages) {
  for (const [metric, limit] of Object.entries(limits)) {
    if (page[metric] > limit) failures.push(`${page.path}: ${metric} ${page[metric]} > ${limit}`);
  }
}
const summary = Object.fromEntries(
  Object.keys(limits).map((metric) => [
    metric,
    pages.reduce(
      (largest, page) =>
        page[metric] > largest.bytes ? { page: page.path, bytes: page[metric] } : largest,
      { page: '', bytes: 0 }
    ),
  ])
);
mkdirSync('.astro', { recursive: true });
writeFileSync(
  '.astro/build-budget-report.json',
  `${JSON.stringify({ limits, summary, pages }, null, 2)}\n`
);
console.log(`[budgets] Checked ${pages.length} pages. ${JSON.stringify(summary)}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
