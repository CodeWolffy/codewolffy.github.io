import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMermaidExportMarkup,
  fetchImageBlob,
  findMarkdownImages,
  fixIframesOutsideCodeBlocks,
  replaceMarkdownImageSources,
  restoreMermaidBlocks,
  urlToBase64,
} from '../src/components/blog/export-utils';

const packageImages = (content: string) =>
  replaceMarkdownImageSources(
    content,
    findMarkdownImages(content).map((image, index) => ({
      ...image,
      newSrc: `assets/image-${index}.png`,
    }))
  );

test('Markdown export preserves fenced and inline examples byte for byte', () => {
  const examples = [
    '```markdown\n![example](/a.png)\n```',
    '~~~~markdown\n![example](/b.png)\n~~~\n![still code](/c.png)\n~~~~',
    '````md\n```\n![example](/d.png)\n```\n````',
    '`![example](/e.png)` and `` ` ![example](/f.png) ` ``',
    '``![multiline]\n(/g.png)``',
    '> ```md\n> ![example](/h.png)\n> ```',
  ].join('\n\n');
  const content = `${examples}\n\n![real](/real.png "Image title")`;
  assert.equal(packageImages(content), `${examples}\n\n![real](assets/image-0.png "Image title")`);
  assert.deepEqual(findMarkdownImages('~~~md\n![unfinished code](/a.png)'), []);
});

test('Markdown export keeps alt text, titles and balanced or escaped destinations', () => {
  const content = String.raw`![nested [label]](/a(1).png "title")
![escaped\]](/path\(2\).png 'another title')
![angle](</path with spaces.png> "third title")
![query](https://example.com/image?a=1&amp;b=2)
\![literal](/keep.png)`;
  assert.deepEqual(
    findMarkdownImages(content).map((image) => image.src),
    ['/a(1).png', '/path(2).png', '/path with spaces.png', 'https://example.com/image?a=1&b=2']
  );
  assert.equal(
    packageImages(content),
    String.raw`![nested [label]](assets/image-0.png "title")
![escaped\]](assets/image-1.png 'another title')
![angle](<assets/image-2.png> "third title")
![query](assets/image-3.png)
\![literal](/keep.png)`
  );
});

test('reference images become local while ordinary links and definitions remain intact', () => {
  const content = `![cover][Picture]\n![Picture][]\n![Picture]\n[ordinary link][Picture]\n\n[Picture]: </cover image.png> "Cover title"`;
  assert.equal(
    packageImages(content),
    `![cover](<assets/image-0.png> "Cover title")\n![Picture](<assets/image-1.png> "Cover title")\n![Picture](<assets/image-2.png> "Cover title")\n[ordinary link][Picture]\n\n[Picture]: </cover image.png> "Cover title"`
  );
});

test('iframe and Mermaid transformations preserve long fences and code spans', () => {
  const iframe = '<Iframe src="https://www.youtube.com/embed/example" />';
  const diagram = '<Mermaid code={{ value: "graph TD\\nA-->B" }} />';
  const examples = `~~~~md\n${iframe}\n${diagram}\n~~~~\n\`\`${iframe}\`\``;
  assert.equal(fixIframesOutsideCodeBlocks(restoreMermaidBlocks(examples)), examples);
  assert.match(restoreMermaidBlocks(diagram), /^```mermaid\ngraph TD\nA-->B\n```$/);
});

test('HTML exports rendered Mermaid drawings without interactive view state', () => {
  const svg = '<svg viewBox="0 0 100 20"><text>Complete diagram</text></svg>';
  const output = createMermaidExportMarkup(svg, 'graph TD\nA-->B');
  assert.equal(output, `<div class="mermaid">${svg}</div>`);
  assert.doesNotMatch(output, /display:\s*none|mermaid-toolbar|mermaid-code-view/);
});

test('HTML exports unrendered or failed Mermaid diagrams as visible escaped source', () => {
  const output = createMermaidExportMarkup(
    undefined,
    'graph TD\nA[<script>alert(1)</script>] --> B'
  );
  assert.match(output, /图表尚未渲染/);
  assert.match(output, /<pre class="mermaid-source"><code>graph TD\nA\[&lt;script&gt;/);
  assert.doesNotMatch(output, /<script>|display:\s*none/);
});

test('blocked image requests reject instead of reporting a remote URL as an embedded image', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(
    urlToBase64('https://images.example.com/cover.png'),
    /图片下载失败，已取消导出/
  );
  await assert.rejects(
    fetchImageBlob('https://images.example.com/cover.png'),
    /图片下载失败，已取消导出/
  );
});

test('HTTP failures and non-image responses cannot be saved as successful image assets', async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('missing', { status: 404 })
  );
  await assert.rejects(fetchImageBlob('https://example.com/cover.png'), /已取消导出/);
  fetchMock.mock.mockImplementation(
    async () =>
      new Response('<html>login required</html>', { headers: { 'Content-Type': 'text/html' } })
  );
  await assert.rejects(fetchImageBlob('https://example.com/cover.png'), /已取消导出/);
  fetchMock.mock.mockImplementation(async () => new Response(new Blob([], { type: 'image/png' })));
  await assert.rejects(fetchImageBlob('https://example.com/cover.png'), /已取消导出/);
});

test('image downloads retain the complete blob for ZIP packaging', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(new Blob(['image bytes'], { type: 'image/png' }))
  );
  const image = await fetchImageBlob('https://example.com/cover.png');
  assert.equal(image.type, 'image/png');
  assert.equal(await image.text(), 'image bytes');
});

test('embedded image assets are decoded locally without a CSP-sensitive fetch', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('connect-src blocks data:');
  });
  const image = await fetchImageBlob('data:image/png;base64,aW1hZ2UgYnl0ZXM=');
  assert.equal(image.type, 'image/png');
  assert.equal(await image.text(), 'image bytes');
  const svg = await fetchImageBlob('data:image/svg+xml,%3Csvg%3E%E4%B8%AD%E6%96%87%3C%2Fsvg%3E');
  assert.equal(await svg.text(), '<svg>中文</svg>');
  assert.equal(fetchMock.mock.callCount(), 0);
  await assert.rejects(fetchImageBlob('data:image/png;base64,invalid!'), /已取消导出/);
});

test('FileReader conversion errors propagate and never fall back to the remote source', async (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
  Object.defineProperty(globalThis, 'FileReader', {
    configurable: true,
    value: class {
      onerror?: () => void;
      readAsDataURL() {
        this.onerror?.();
      }
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'FileReader', original);
    else Reflect.deleteProperty(globalThis, 'FileReader');
  });
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(new Blob(['image bytes'], { type: 'image/png' }))
  );
  await assert.rejects(urlToBase64('https://example.com/cover.png'), /读取图片失败/);
});
