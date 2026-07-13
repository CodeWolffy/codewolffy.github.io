import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeIframeUrl } from '../src/utils/iframe-url';

test('rejects insecure and unknown iframe origins', () => {
  assert.equal(normalizeIframeUrl('http://www.youtube.com/embed/example'), '');
  assert.equal(normalizeIframeUrl('https://example.com/embed/example'), '');
});

test('normalizes YouTube embeds and disables autoplay', () => {
  const result = new URL(normalizeIframeUrl('https://www.youtube.com/embed/example?autoplay=1'));
  assert.equal(result.hostname, 'www.youtube.com');
  assert.equal(result.searchParams.get('autoplay'), '0');
});

test('normalizes protocol-relative Bilibili iframe markup', () => {
  const result = new URL(
    normalizeIframeUrl('<iframe src="//player.bilibili.com/player.html?bvid=BV1test"></iframe>')
  );

  assert.equal(result.protocol, 'https:');
  assert.equal(result.searchParams.get('autoplay'), '0');
  assert.equal(result.searchParams.get('as_wide'), '1');
  assert.equal(result.searchParams.get('high_quality'), '1');
  assert.equal(result.searchParams.get('danmaku'), '0');
});
