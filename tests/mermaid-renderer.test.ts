import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { createMermaidRenderer, type MermaidTheme } from '../src/components/mdx/mermaid-renderer';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

function createHarness(render: (source: string, theme: MermaidTheme) => Promise<string>) {
  const chart = (id: string) => ({
    id,
    dataset: {} as Record<string, string>,
    isConnected: true,
    innerHTML: '',
    error: '',
    getAttribute: () => id,
    querySelector: () => ({}),
    replaceChildren(message: { textContent: string }) {
      this.innerHTML = '';
      this.error = message.textContent;
    },
  });
  type Chart = ReturnType<typeof chart>;
  let charts: Chart[] = [];
  let dark = false;
  const body = () => {
    const ownCharts = charts;
    return {
      isConnected: true,
      contains: (element: unknown) => ownCharts.includes(element as Chart),
    };
  };
  const doc = {
    body: body(),
    fonts: { ready: Promise.resolve() },
    documentElement: { classList: { contains: () => dark } },
    querySelectorAll: () => charts,
    createElement: () => ({ className: '', textContent: '' }),
  };
  let configuredTheme: MermaidTheme = 'light';
  const commits: string[] = [];
  const errors: unknown[] = [];
  const ids: string[] = [];
  const renderer = createMermaidRenderer({
    document: doc as unknown as Document,
    loadMermaid: async () => ({
      initialize() {},
      async render(id, source) {
        ids.push(id);
        return { svg: await render(source, configuredTheme), diagramType: 'flowchart-v2' };
      },
    }),
    configure: (_mermaid, theme) => {
      configuredTheme = theme;
    },
    normalizeChart: (source) => source,
    onRendered: (element) => commits.push(element.id),
    onError: (error) => errors.push(error),
  });
  const setPage = (...names: string[]) => {
    doc.body.isConnected = false;
    charts.forEach((element) => (element.isConnected = false));
    charts = names.map(chart);
    doc.body = body();
    return charts;
  };
  return { renderer, setPage, setDark: () => (dark = true), commits, errors, ids, doc };
}

test('a theme change during the second chart keeps the preview and rerenders every chart', async () => {
  const gate = deferred();
  const calls: string[] = [];
  const harness = createHarness(async (source, theme) => {
    calls.push(`${source}:${theme}`);
    if (source === 'second' && theme === 'light') await gate.promise;
    return `<svg>${source}:${theme}</svg>`;
  });
  const [first, second] = harness.setPage('first', 'second');
  const pending = harness.renderer.request();
  await setImmediate();
  assert.equal(first.innerHTML, '<svg>first:light</svg>');

  harness.setDark();
  harness.renderer.invalidate();
  const replacement = harness.renderer.request();
  assert.equal(first.innerHTML, '<svg>first:light</svg>', 'the current SVG stays visible');
  gate.resolve();
  await Promise.all([pending, replacement]);

  assert.equal(first.innerHTML, '<svg>first:dark</svg>');
  assert.equal(second.innerHTML, '<svg>second:dark</svg>');
  assert.deepEqual(harness.commits, ['first', 'first', 'second']);
  assert.deepEqual(calls, ['first:light', 'second:light', 'first:dark', 'second:dark']);
  assert.equal(
    new Set(harness.ids).size,
    harness.ids.length,
    'replacement IDs never reuse live SVG IDs'
  );
});

test('navigation during an awaited render discards the old result and drains the new page', async () => {
  const gate = deferred();
  const harness = createHarness(async (source) => {
    if (source === 'old') await gate.promise;
    return `<svg>${source}</svg>`;
  });
  const [old] = harness.setPage('old');
  const pending = harness.renderer.request();
  await setImmediate();
  harness.renderer.invalidate();
  const [next] = harness.setPage('next');
  const replacement = harness.renderer.request();
  gate.resolve();
  await Promise.all([pending, replacement]);
  assert.equal(old.innerHTML, '');
  assert.equal(next.innerHTML, '<svg>next</svg>');
  assert.deepEqual(harness.commits, ['next']);
});

test('leaving a page while fonts load does not load Mermaid or mutate a replacement page', async () => {
  const gate = deferred();
  let renderCount = 0;
  const harness = createHarness(async () => {
    renderCount += 1;
    return '<svg></svg>';
  });
  harness.doc.fonts.ready = gate.promise;
  harness.setPage('old');
  const pending = harness.renderer.request();
  harness.renderer.invalidate();
  const [next] = harness.setPage('next');
  gate.resolve();
  await pending;
  assert.equal(renderCount, 0);
  assert.equal(next.innerHTML, '');
  await harness.renderer.request();
  assert.equal(renderCount, 1);
});

test('a stale failed render cannot replace the new page with an error', async () => {
  const gate = deferred();
  const harness = createHarness(async (source) => {
    if (source === 'old') {
      await gate.promise;
      throw new Error('old render failed');
    }
    return '<svg>new</svg>';
  });
  const [old] = harness.setPage('old');
  const pending = harness.renderer.request();
  await setImmediate();
  harness.renderer.invalidate();
  const [next] = harness.setPage('next');
  void harness.renderer.request();
  gate.resolve();
  await pending;
  assert.equal(old.error, '');
  assert.equal(next.error, '');
  assert.equal(next.innerHTML, '<svg>new</svg>');
  assert.deepEqual(harness.errors, []);
});

test('a malformed chart has a text error while the next chart still renders', async () => {
  const harness = createHarness(async (source) => {
    if (source === 'bad') throw new Error('<img src=x onerror=alert(1)>');
    return '<svg>good</svg>';
  });
  const [bad, good] = harness.setPage('bad', 'good');
  await harness.renderer.request();
  assert.equal(bad.innerHTML, '');
  assert.match(bad.error, /^渲染失败: <img/);
  assert.equal(good.innerHTML, '<svg>good</svg>');
  assert.equal(harness.errors.length, 1);
});
