import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generatePostOptions } from '../scripts/generate-post-options.mjs';

test('post options follow additions, renames and removals without rewriting unchanged output', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-post-options-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const posts = path.join(root, 'src/content/blog');
  const output = path.join(root, 'src/generated/post-options.json');
  await fs.mkdir(posts, { recursive: true });
  await fs.writeFile(path.join(posts, 'first.mdx'), '---\ntitle: First\n---\nBody');
  assert.deepEqual(await generatePostOptions(root), { changed: true, count: 1 });
  const fixedTime = new Date('2020-01-01T00:00:00Z');
  await fs.utimes(output, fixedTime, fixedTime);
  assert.deepEqual(await generatePostOptions(root), { changed: false, count: 1 });
  assert.equal((await fs.stat(output)).mtimeMs, fixedTime.getTime());

  await fs.rename(path.join(posts, 'first.mdx'), path.join(posts, 'renamed.mdx'));
  await fs.writeFile(path.join(posts, 'second.md'), '---\ntitle: Second\n---\nBody');
  assert.deepEqual(await generatePostOptions(root), { changed: true, count: 2 });
  assert.deepEqual(JSON.parse(await fs.readFile(output, 'utf8')), [
    { label: 'First', value: 'renamed' },
    { label: 'Second', value: 'second' },
  ]);
  await fs.unlink(path.join(posts, 'renamed.mdx'));
  assert.deepEqual(await generatePostOptions(root), { changed: true, count: 1 });
  assert.deepEqual(JSON.parse(await fs.readFile(output, 'utf8')), [
    { label: 'Second', value: 'second' },
  ]);
});
