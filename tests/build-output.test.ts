import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { prepareCloudflarePagesOutput } from '../scripts/prepare-cloudflare-pages-output.js';
import { createPageAssetMeasurer } from '../scripts/lib/build-budgets.mjs';

test('Pages packaging preserves Workers settings and uses the project Pages configuration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'blog-pages-test-'));
  try {
    const rawBuild = join(root, '.astro/cloudflare-build');
    await mkdir(join(rawBuild, 'client'), { recursive: true });
    await mkdir(join(rawBuild, 'server'), { recursive: true });
    await mkdir(join(root, 'dist/server'), { recursive: true });
    await writeFile(join(root, 'dist/server/stale.mjs'), 'old deployment');
    await writeFile(join(rawBuild, 'client/index.html'), '<h1>Site</h1>');
    await writeFile(join(rawBuild, 'client/.assetsignore'), 'worker metadata');
    await writeFile(join(rawBuild, 'server/entry.mjs'), 'export default {};');
    const workers = JSON.stringify({ main: 'entry.mjs', assets: { directory: '../client' } });
    await writeFile(join(rawBuild, 'server/wrangler.json'), workers);
    await writeFile(
      join(root, 'wrangler.toml'),
      'name = "custom-site"\npages_build_output_dir = "dist"\n'
    );
    prepareCloudflarePagesOutput(root);
    assert.equal(await readFile(join(rawBuild, 'server/wrangler.json'), 'utf8'), workers);
    assert.equal(await readFile(join(root, 'dist/index.html'), 'utf8'), '<h1>Site</h1>');
    assert.match(
      await readFile(join(root, '.astro/pages-wrangler.toml'), 'utf8'),
      /name = "custom-site"/
    );
    assert.match(
      await readFile(join(root, '.astro/pages-wrangler.toml'), 'utf8'),
      /pages_build_output_dir = "\.\.\/dist"/
    );
    assert.match(
      await readFile(join(root, 'dist/_worker.js/index.js'), 'utf8'),
      /createPagesWorker/
    );
    const routes = JSON.parse(await readFile(join(root, 'dist/_routes.json'), 'utf8'));
    assert.ok(routes.include.includes('/music/*'));
    assert.ok(routes.include.includes('/keystatic'));
    await assert.rejects(access(join(root, 'dist/server')));
    await assert.rejects(access(join(root, 'dist/client')));
    await assert.rejects(access(join(root, 'dist/wrangler.toml')));
    await assert.rejects(access(join(root, 'dist/.assetsignore')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('startup budgets follow shared imports once and exclude visible islands and dynamic imports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'blog-budget-test-'));
  try {
    const shared = 'export const value = 1;';
    const entry = 'import {value} from "./shared.js"; console.log(value); import("./lazy.js");';
    const idle = 'export {value} from "./shared.js";';
    for (const [file, source] of Object.entries({
      'entry.js': entry,
      'shared.js': shared,
      'idle.js': idle,
    })) {
      await writeFile(join(root, file), source);
    }
    const measure = await createPageAssetMeasurer(root);
    const result = measure(
      '<script type="module" src="/entry.js"></script><astro-island client="idle" component-url="/idle.js"></astro-island><astro-island client="visible" component-url="/not-loaded.js"></astro-island>'
    );
    assert.equal(result.initialJavaScriptFiles, 3);
    assert.equal(
      result.initialJavaScriptGzipBytes,
      [shared, entry, idle].reduce((sum, code) => sum + gzipSync(code).byteLength, 0)
    );
    assert.throws(() => measure('<script src="/missing.js"></script>'), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
