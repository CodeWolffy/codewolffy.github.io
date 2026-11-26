import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getTrimmedSearchQuery,
  shouldShowSearchSkeleton,
} from '../src/components/blog/search-state';

test('getTrimmedSearchQuery normalizes surrounding whitespace', () => {
  assert.equal(getTrimmedSearchQuery('  Redis  '), 'Redis');
  assert.equal(getTrimmedSearchQuery('   '), '');
});

test('shouldShowSearchSkeleton covers asset loading, IME composition, and unsettled queries', () => {
  assert.equal(
    shouldShowSearchSkeleton({
      searchStatus: 'loading',
      searchValue: '',
      isComposing: false,
      settledQuery: '',
    }),
    true
  );

  assert.equal(
    shouldShowSearchSkeleton({
      searchStatus: 'ready',
      searchValue: '   ',
      isComposing: false,
      settledQuery: '',
    }),
    false
  );

  assert.equal(
    shouldShowSearchSkeleton({
      searchStatus: 'ready',
      searchValue: 'shujuku',
      isComposing: true,
      settledQuery: 'shujuku',
    }),
    true
  );

  assert.equal(
    shouldShowSearchSkeleton({
      searchStatus: 'ready',
      searchValue: 'Redis 锁',
      isComposing: false,
      settledQuery: 'Redis',
    }),
    true
  );

  assert.equal(
    shouldShowSearchSkeleton({
      searchStatus: 'ready',
      searchValue: 'Redis ',
      isComposing: false,
      settledQuery: 'Redis',
    }),
    false
  );

  assert.equal(
    shouldShowSearchSkeleton({
      searchStatus: 'unavailable',
      searchValue: 'Redis',
      isComposing: false,
      settledQuery: '',
    }),
    false
  );
});
