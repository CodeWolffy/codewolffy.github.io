import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

import { observeCommentLoading } from '../src/components/blog/comment-loading';

function createWidgetFixture(t: TestContext) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const listeners = new Set<(event: MessageEvent<unknown>) => void>();
  const timers: { callback: () => void; cancelled: boolean }[] = [];
  let iframeWindow = {} as Window;
  let mounted = true;
  const iframe = new EventTarget();
  Object.defineProperty(iframe, 'contentWindow', { get: () => iframeWindow });
  const widget = {
    shadowRoot: { querySelector: (selector: string) => (selector === 'iframe' ? iframe : null) },
  };
  const container = {
    isConnected: true,
    querySelector: (selector: string) => (mounted && selector === 'giscus-widget' ? widget : null),
  };

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
        if (type === 'message') listeners.add(listener);
      },
      removeEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
        if (type === 'message') listeners.delete(listener);
      },
      setTimeout: (callback: () => void, delay: number) => {
        assert.equal(delay, 15000);
        return timers.push({ callback, cancelled: false });
      },
      clearTimeout: (id: number) => {
        timers[id - 1].cancelled = true;
      },
    },
  });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });

  const results: string[] = [];
  const start = () =>
    observeCommentLoading(container as unknown as HTMLElement, (state) => {
      results.push(state);
    });
  const send = (
    data: unknown,
    source: Window | null = iframeWindow,
    origin = 'https://giscus.app'
  ) => {
    const event = { data, source, origin } as MessageEvent<unknown>;
    for (const listener of listeners) listener(event);
  };
  const expire = () => {
    for (const timer of timers) if (!timer.cancelled) timer.callback();
  };

  return {
    start,
    send,
    expire,
    results,
    listeners,
    timers,
    container,
    iframe,
    setMounted: (value: boolean) => {
      mounted = value;
    },
    replaceIframe: () => {
      const oldWindow = iframeWindow;
      iframeWindow = {} as Window;
      return oldWindow;
    },
  };
}

test('discussion metadata from the shadow iframe clears the loading deadline', (t) => {
  const fixture = createWidgetFixture(t);
  fixture.setMounted(false);
  fixture.start();
  fixture.send({ giscus: { discussion: { id: 'discussion' } } });
  assert.deepEqual(fixture.results, []);

  // @giscus/react creates the custom element asynchronously after its module import.
  fixture.setMounted(true);
  fixture.send({ giscus: { discussion: { id: 'discussion' } } });
  fixture.expire();
  fixture.timers[0].callback(); // A queued callback must also be harmless after success.
  assert.deepEqual(fixture.results, ['ready']);
  assert.equal(fixture.timers[0].cancelled, true);
  assert.equal(fixture.listeners.size, 0);
});

test('load, resize, malformed messages and unrelated frames cannot hide a network timeout', (t) => {
  const fixture = createWidgetFixture(t);
  fixture.start();
  fixture.iframe.dispatchEvent(new Event('load'));
  fixture.send({ giscus: { resizeHeight: 400 } });
  fixture.send({ giscus: { discussion: {} } });
  fixture.send({ giscus: { discussion: { id: '' } } });
  fixture.send(null);
  fixture.send({ giscus: null });
  fixture.send({ giscus: { discussion: { id: 'untrusted' } } }, {} as Window);
  fixture.send({ giscus: { discussion: { id: 'untrusted' } } }, null);
  fixture.send({ giscus: { discussion: { id: 'untrusted' } } }, undefined, 'https://other.test');
  assert.deepEqual(fixture.results, []);

  fixture.expire();
  assert.deepEqual(fixture.results, ['error']);
  assert.equal(fixture.listeners.size, 0);
});

test('a missing discussion is a ready empty comment editor', (t) => {
  const fixture = createWidgetFixture(t);
  fixture.start();
  fixture.send({ giscus: { error: 'Discussion not found.' } });
  fixture.expire();
  assert.deepEqual(fixture.results, ['ready']);
});

test('a genuine widget loading error clears the deadline immediately', (t) => {
  const fixture = createWidgetFixture(t);
  fixture.start();
  fixture.send({ giscus: { error: 'Repository not found.' } });
  fixture.expire();
  assert.deepEqual(fixture.results, ['error']);
  assert.equal(fixture.timers[0].cancelled, true);
});

test('expired login recovery can finish loading anonymously', (t) => {
  const fixture = createWidgetFixture(t);
  fixture.start();
  fixture.send({ giscus: { error: 'Bad credentials' } });
  fixture.send({ giscus: { error: 'Invalid state value' } });
  fixture.send({ giscus: { error: 'State has expired' } });
  fixture.send({ giscus: { signOut: true, error: 'State has expired (user signed out).' } });
  assert.deepEqual(fixture.results, []);
  fixture.send({ giscus: { discussion: { id: 'discussion' } } });
  assert.deepEqual(fixture.results, ['ready']);
});

test('a retry ignores the old iframe and its queued timeout', (t) => {
  const fixture = createWidgetFixture(t);
  fixture.start();
  fixture.expire();
  assert.deepEqual(fixture.results, ['error']);

  const oldWindow = fixture.replaceIframe();
  fixture.start();
  fixture.send({ giscus: { discussion: { id: 'stale' } } }, oldWindow);
  fixture.send({ giscus: { error: 'Stale error' } }, oldWindow);
  fixture.timers[0].callback();
  assert.deepEqual(fixture.results, ['error']);

  fixture.send({ giscus: { discussion: { id: 'fresh' } } });
  fixture.expire();
  assert.deepEqual(fixture.results, ['error', 'ready']);
  assert.equal(fixture.listeners.size, 0);
});

test('cancelling rapid attempts and leaving the page prevents stale updates', (t) => {
  const fixture = createWidgetFixture(t);
  const cancelFirst = fixture.start();
  const oldListener = [...fixture.listeners][0];
  cancelFirst();
  cancelFirst();
  fixture.replaceIframe();
  const cancelSecond = fixture.start();
  cancelSecond();
  fixture.replaceIframe();
  const cancelThird = fixture.start();
  fixture.container.isConnected = false;
  fixture.send({ giscus: { discussion: { id: 'unmounted' } } });
  fixture.expire();
  cancelThird();
  oldListener({
    origin: 'https://giscus.app',
    data: { giscus: { error: 'stale' } },
  } as MessageEvent);
  for (const timer of fixture.timers) timer.callback();
  assert.deepEqual(fixture.results, []);
  assert.equal(fixture.listeners.size, 0);
  assert.ok(fixture.timers.every((timer) => timer.cancelled));
});
