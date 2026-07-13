import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBlogPostPath,
  getCategoryPath,
  getContentPathSegment,
  getSeriesPath,
  getTagPath,
} from '../src/utils/content-paths';

test('content paths remove trailing index segments and encode each segment', () => {
  assert.equal(
    getContentPathSegment('Java/核心 基础/index'),
    'Java/%E6%A0%B8%E5%BF%83%20%E5%9F%BA%E7%A1%80'
  );
});

test('content route helpers return canonical trailing-slash paths', () => {
  assert.equal(getBlogPostPath({ id: 'hello world' }), '/blog/hello%20world/');
  assert.equal(
    getCategoryPath('数据库设计'),
    '/categories/%E6%95%B0%E6%8D%AE%E5%BA%93%E8%AE%BE%E8%AE%A1/'
  );
  assert.equal(getTagPath('REST/API'), '/tags/REST/API/');
  assert.equal(getSeriesPath('java-core'), '/series/java-core/');
});
