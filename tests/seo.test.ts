import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createRobotsTxt,
  escapeXml,
  getCanonicalUrl,
  getLatestContentDate,
  hasValidContentDates,
  serializeJsonLd,
} from '../src/utils/seo';
import { createSitemapPolicy } from '../src/utils/sitemap-policy';

test('canonical URLs always use the primary origin and omit search state', () => {
  assert.equal(
    getCanonicalUrl('https://mirror.example/blog/post/?q=java#title', 'https://primary.example')
      .href,
    'https://primary.example/blog/post/'
  );
  assert.equal(
    getCanonicalUrl('https://mirror.example//other.example/path/', 'https://primary.example')
      .origin,
    'https://primary.example'
  );
  const robots = createRobotsTxt('https://primary.example');
  assert.match(robots, /Sitemap: https:\/\/primary\.example\/sitemap-index\.xml/);
  assert.match(robots, /Disallow: \/keystatic\//);
});

test('structured metadata escapes HTML script endings without changing its value', () => {
  const value = { title: '</script><script>alert(1)</script> & \u2028' };
  const serialized = serializeJsonLd(value);
  assert.equal(serialized.includes('<'), false);
  assert.deepEqual(JSON.parse(serialized), value);
  assert.equal(escapeXml('Java & <XML> "quotes"'), 'Java &amp; &lt;XML&gt; &quot;quotes&quot;');
});

test('RSS activity includes updates to older posts and date validation rejects reversed dates', () => {
  const posts = [
    { data: { pubDate: new Date('2026-09-02') } },
    { data: { pubDate: new Date('2024-01-01'), updatedDate: new Date('2026-11-07') } },
  ];
  assert.equal(getLatestContentDate(posts).toISOString(), '2026-11-07T00:00:00.000Z');
  assert.equal(
    hasValidContentDates({ pubDate: new Date('2026-04-20'), updatedDate: new Date('2026-01-23') }),
    false
  );
  assert.equal(hasValidContentDates({ pubDate: new Date('2026-04-20') }), true);
});

test('sitemap policy excludes single-post and draft-only tags on either deployment', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'blog-sitemap-test-'));
  try {
    await mkdir(path.join(directory, 'nested'));
    await writeFile(
      path.join(directory, 'one.mdx'),
      '---\ntags: [Java, 单篇标签, Java]\n---\nBody'
    );
    await writeFile(path.join(directory, 'nested', 'two.md'), '---\ntags: [Java]\n---\nBody');
    await writeFile(
      path.join(directory, 'draft.mdx'),
      '---\ndraft: true\ntags: [单篇标签, 草稿]\n---\nBody'
    );
    const policy = await createSitemapPolicy({
      contentDirectory: directory,
      primarySiteUrl: 'https://primary.example',
    });
    assert.equal(policy.filter('https://mirror.example/tags/Java/'), true);
    assert.equal(
      policy.filter('https://mirror.example/tags/%E5%8D%95%E7%AF%87%E6%A0%87%E7%AD%BE/'),
      false
    );
    assert.equal(policy.filter('https://mirror.example/tags/草稿/'), false);
    assert.equal(policy.filter('https://mirror.example/tags/'), true);
    assert.equal(policy.filter('https://mirror.example/404.html'), false);
    assert.equal(policy.filter('https://mirror.example/api/keystatic/'), false);
    assert.equal(
      policy.canonicalize('https://mirror.example/blog/post/'),
      'https://primary.example/blog/post/'
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
