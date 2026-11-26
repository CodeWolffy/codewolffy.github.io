import assert from 'node:assert/strict';
import test from 'node:test';

import { formatPostDate, getDedupedMainTagLabel } from '../src/utils/post-meta';

test('formatPostDate formats dates consistently as YYYY-MM-DD', () => {
  assert.equal(formatPostDate(new Date(2026, 8, 2)), '2026-09-02');
  assert.equal(formatPostDate(new Date(2026, 11, 25)), '2026-12-25');
});

test('getDedupedMainTagLabel skips tags already expressed by series or category context', () => {
  const tagMap = new Map<string, string>([
    ['Java', 'Java'],
    ['SPI', 'SPI'],
    ['Redis', 'Redis'],
    ['缓存', '缓存'],
    ['Go', 'Go'],
    ['Google', 'Google'],
  ]);

  assert.equal(getDedupedMainTagLabel(['Java', 'SPI'], tagMap, 'JVM 与 Java 核心'), 'SPI');
  assert.equal(getDedupedMainTagLabel(['Redis', '缓存'], tagMap, 'Redis 深度专题'), '缓存');
  assert.equal(getDedupedMainTagLabel(['Java'], tagMap, 'Java 与 JVM'), undefined);
  assert.equal(getDedupedMainTagLabel(['Go'], tagMap, 'Google 工具链'), 'Go');
});
