import assert from 'node:assert/strict';
import test from 'node:test';
import { lockPageScroll } from '../src/lib/scroll-lock';

function createPage() {
  const root = { clientWidth: 980, style: { overflow: 'auto', paddingRight: '' } };
  const body = { style: { overflow: '', paddingRight: '8px' } };
  const doc = { documentElement: root, body };
  const view = {
    innerWidth: 1000,
    getComputedStyle: () => ({ paddingRight: '8px' }),
  };
  const lock = () => lockPageScroll(doc as unknown as Document, view as unknown as Window);
  return { root, body, doc, lock };
}

test('overlapping panels restore the original scroll state in either closing order', () => {
  for (const order of [
    [0, 1],
    [1, 0],
  ]) {
    const { root, body, lock } = createPage();
    const releases = [lock(), lock()];
    assert.equal(body.style.paddingRight, '28px');
    assert.equal(body.style.overflow, '');
    releases[order[0]]();
    assert.equal(root.style.overflow, 'hidden');
    assert.equal(body.style.overflow, '');
    releases[order[1]]();
    assert.equal(root.style.overflow, 'auto');
    assert.equal(body.style.overflow, '');
    assert.equal(body.style.paddingRight, '8px');
  }
});

test('navigation release and later effect cleanup are idempotent', () => {
  const { root, body, lock } = createPage();
  const releaseOldPanel = lock();
  releaseOldPanel();
  const releaseNewPanel = lock();
  body.style.overflow = 'clip';
  releaseOldPanel();
  assert.equal(root.style.overflow, 'hidden');
  releaseNewPanel();
  assert.equal(root.style.overflow, 'auto');
  assert.equal(body.style.overflow, 'clip');
  assert.equal(body.style.paddingRight, '8px');
});

test('cleanup restores the captured body without writing to the replacement body', () => {
  const { body, doc, lock } = createPage();
  const release = lock();
  assert.equal(body.style.overflow, '');
  doc.body = { style: { overflow: 'clip', paddingRight: '12px' } };
  release();
  assert.equal(body.style.overflow, '');
  assert.equal(body.style.paddingRight, '8px');
  assert.deepEqual(doc.body.style, { overflow: 'clip', paddingRight: '12px' });
});
