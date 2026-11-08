import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchMusicAsset } from '../scripts/lib/music-assets.mjs';

const url = 'https://example.com/music/song.mp3';
const original = '0123456789';

function assetResponse(headers: HeadersInit = {}) {
  return new Response(original, {
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '10', ...headers },
  });
}

async function serve(range?: string, response = assetResponse(), extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  if (range) headers.set('Range', range);
  return fetchMusicAsset(new Request(url, { headers }), {
    ASSETS: { fetch: async () => response },
  });
}

test('ordinary GET streams the original response without consuming it', async () => {
  const upstream = assetResponse();
  const response = await serve(undefined, upstream);
  assert.equal(upstream.bodyUsed, false);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(await response.text(), original);
});

test('HEAD ignores Range and If-Range while preserving the complete Content-Length', async () => {
  const response = await fetchMusicAsset(
    new Request(url, { method: 'HEAD', headers: { Range: 'bytes=2-3', 'If-Range': '"old"' } }),
    {
      ASSETS: {
        fetch: async (request: Request) => {
          assert.equal(request.method, 'HEAD');
          assert.equal(request.headers.has('range'), false);
          assert.equal(request.headers.has('if-range'), false);
          return new Response(null, { headers: { 'Content-Length': '10' } });
        },
      },
    }
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), '10');
  assert.equal((await response.arrayBuffer()).byteLength, 0);
});

test('native 206 and error responses preserve status, headers, and body', async () => {
  for (const status of [206, 404, 416]) {
    const upstream = new Response('native', {
      status,
      headers: { 'Content-Range': status === 206 ? 'bytes 0-5/10' : 'bytes */10' },
    });
    const response = await serve('bytes=0-5', upstream);
    assert.equal(response.status, status);
    assert.equal(response.headers.get('content-range'), upstream.headers.get('content-range'));
    assert.equal(await response.text(), 'native');
  }
});

test('single closed, open, suffix, and oversize-end ranges return the exact bytes', async () => {
  for (const [range, body, contentRange] of [
    ['bytes=2-4', '234', 'bytes 2-4/10'],
    ['bytes=7-', '789', 'bytes 7-9/10'],
    ['bytes=-3', '789', 'bytes 7-9/10'],
    ['bytes=-100', original, 'bytes 0-9/10'],
    ['bytes=7-99999999999999999999999', '789', 'bytes 7-9/10'],
  ]) {
    const response = await serve(range);
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('content-range'), contentRange, range);
    assert.equal(response.headers.get('content-length'), String(body.length), range);
    assert.equal(await response.text(), body, range);
  }
});

test('unknown lengths are resolved before returning suffix ranges', async () => {
  const response = await serve('bytes=-3', new Response(original));
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 7-9/10');
  assert.equal(await response.text(), '789');
});

test('unsatisfiable and empty-file ranges return a zero-length 416 and cancel the body', async () => {
  for (const range of ['bytes=10-', 'bytes=-0', 'bytes=999999999999999999999-']) {
    let cancelled = false;
    const upstream = new Response(
      new ReadableStream(
        {
          cancel: () => {
            cancelled = true;
          },
        },
        { highWaterMark: 0 }
      ),
      { headers: { 'Content-Length': '10' } }
    );
    const response = await serve(range, upstream);
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('content-range'), 'bytes */10');
    assert.equal(response.headers.get('content-length'), '0');
    assert.equal((await response.arrayBuffer()).byteLength, 0);
    assert.equal(cancelled, true);
  }
  const response = await serve(
    'bytes=0-',
    new Response('', { headers: { 'Content-Length': '0' } })
  );
  assert.equal(response.status, 416);
  assert.equal(response.headers.get('content-range'), 'bytes */0');
});

test('invalid, unsupported, and multiple ranges are ignored in the upstream request', async () => {
  for (const range of ['bytes=6-2', 'bytes=-', 'bytes=a-b', 'items=0-2', 'bytes=0-1,4-5']) {
    const response = await fetchMusicAsset(
      new Request(url, { headers: { Range: range, 'If-Range': '"old"' } }),
      {
        ASSETS: {
          fetch: async (request: Request) => {
            assert.equal(request.headers.has('range'), false, range);
            assert.equal(request.headers.has('if-range'), false, range);
            return assetResponse();
          },
        },
      }
    );
    assert.equal(response.status, 200, range);
    assert.equal(await response.text(), original, range);
  }
});

test('If-Range uses strong ETag comparison and returns complete content on mismatch', async () => {
  for (const [requested, etag, status] of [
    ['"current"', '"current"', 206],
    ['"old"', '"current"', 200],
    ['W/"current"', 'W/"current"', 200],
    ['"current"', 'W/"current"', 200],
    ['"current"', '', 200],
  ] as const) {
    const response = await serve('bytes=7-', assetResponse({ ETag: etag }), {
      'If-Range': requested,
    });
    assert.equal(response.status, status, requested);
    assert.equal(await response.text(), status === 206 ? '789' : original);
  }
});

test('If-Range HTTP dates must match Last-Modified exactly', async () => {
  const modified = 'Wed, 21 Oct 2015 07:28:00 GMT';
  for (const [requested, status] of [
    [modified, 206],
    ['Wed, 21 Oct 2015 07:27:59 GMT', 200],
    ['Wed, 21 Oct 2015 07:28:01 GMT', 200],
    ['0', 200],
    ['invalid date', 200],
  ] as const) {
    const response = await serve('bytes=7-', assetResponse({ 'Last-Modified': modified }), {
      'If-Range': requested,
    });
    assert.equal(response.status, status, requested);
    assert.equal(await response.text(), status === 206 ? '789' : original);
  }
  assert.equal((await serve('bytes=7-', assetResponse(), { 'If-Range': modified })).status, 200);
});

test('known-length fallback stops reading after the requested end and cancels remaining bytes', async () => {
  let reads = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        reads++;
        controller.enqueue(new TextEncoder().encode('01234'));
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 }
  );
  const response = await serve(
    'bytes=1-2',
    new Response(body, { headers: { 'Content-Length': '1000000' } })
  );
  assert.equal(await response.text(), '12');
  assert.equal(reads, 1);
  assert.equal(cancelled, true);
});

test('cancelling a range response cancels the source stream', async () => {
  let reason: unknown;
  const body = new ReadableStream(
    {
      cancel(value) {
        reason = value;
      },
    },
    { highWaterMark: 0 }
  );
  const response = await serve(
    'bytes=1-2',
    new Response(body, { headers: { 'Content-Length': '10' } })
  );
  await response.body?.cancel('navigation');
  assert.equal(reason, 'navigation');
});

test('streaming ranges skip prefix chunks and stop correctly inside the final chunk', async () => {
  const chunks = ['01', '234', '567', '89'];
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(new TextEncoder().encode(chunk));
        else controller.close();
      },
    },
    { highWaterMark: 0 }
  );
  const response = await serve(
    'bytes=3-6',
    new Response(body, { headers: { 'Content-Length': '10' } })
  );
  assert.equal(await response.text(), '3456');
  assert.deepEqual(chunks, ['89']);
});

test('source stream failures propagate to the range consumer', async () => {
  const body = new ReadableStream(
    {
      pull(controller) {
        controller.error(new Error('upstream disconnected'));
      },
    },
    { highWaterMark: 0 }
  );
  const response = await serve(
    'bytes=3-6',
    new Response(body, { headers: { 'Content-Length': '10' } })
  );
  await assert.rejects(response.text(), /upstream disconnected/);
});

test('encoded full responses are preserved rather than slicing potentially decoded bytes', async () => {
  const response = await serve('bytes=1-2', assetResponse({ 'Content-Encoding': 'gzip' }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), original);
});
