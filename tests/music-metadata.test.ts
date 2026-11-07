import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import { createTrackMetadataController } from '../src/components/music/use-track-metadata';
import { loadMp3Metadata, type Mp3Metadata } from '../src/lib/mp3-metadata';

function id3Tag(frames: [string, Uint8Array][]) {
  const body = Buffer.concat(
    frames.map(([id, data]) => {
      const header = Buffer.alloc(10);
      header.write(id);
      header.writeUInt32BE(data.length, 4);
      return Buffer.concat([header, data]);
    })
  );
  const header = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]);
  for (let index = 0; index < 4; index += 1) {
    header[9 - index] = (body.length >>> (index * 7)) & 0x7f;
  }
  return Buffer.concat([header, body]);
}

const textFrame = (value: string) => Buffer.concat([Buffer.from([3]), Buffer.from(value)]);
const coverFrame = () =>
  Buffer.concat([
    Buffer.from([0]),
    Buffer.from('image/jpeg\0'),
    Buffer.from([3, 0, 255, 216, 255]),
  ]);

function rangeResponse(bytes: Uint8Array, init?: RequestInit) {
  const range = new Headers(init?.headers).get('Range') ?? '';
  const suffix = range.match(/^bytes=-(\d+)$/);
  const prefix = range.match(/^bytes=(\d+)-(\d+)$/);
  assert.ok(suffix || prefix, `Expected a Range request, received ${range}`);
  const data = suffix
    ? bytes.subarray(Math.max(0, bytes.length - Number(suffix[1])))
    : bytes.subarray(Number(prefix![1]), Number(prefix![2]) + 1);
  return new Response(Uint8Array.from(data), { status: 206 });
}

async function advanceDebounce(t: TestContext) {
  t.mock.timers.tick(200);
  await setImmediate();
}

test('metadata network and HTTP failures reject instead of becoming a successful empty cache', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('offline');
  });
  await assert.rejects(loadMp3Metadata('/song.mp3'), /offline/);
  assert.equal(fetchMock.mock.callCount(), 1);

  fetchMock.mock.mockImplementation(async () => new Response('unavailable', { status: 503 }));
  await assert.rejects(loadMp3Metadata('/song.mp3'), /503/);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('tagless MP3s succeed empty and ID3v1 remains a supported fallback', async (t) => {
  const bytes = Buffer.alloc(256);
  const ranges: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_src: unknown, init?: RequestInit) => {
    ranges.push(new Headers(init?.headers).get('Range') ?? '');
    return rangeResponse(bytes, init);
  });

  assert.deepEqual(await loadMp3Metadata('/song.mp3'), {});
  assert.deepEqual(ranges, ['bytes=0-9', 'bytes=-128']);

  bytes.write('TAG', 128);
  bytes.write('Legacy song', 131);
  bytes.write('Legacy artist', 161);
  bytes.write('Legacy album', 191);
  assert.deepEqual(await loadMp3Metadata('/song.mp3'), {
    title: 'Legacy song',
    artist: 'Legacy artist',
    album: 'Legacy album',
  });
});

test('a failed required ID3v1 fallback rejects when no useful ID3v2 metadata exists', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_src: unknown, init?: RequestInit) => {
    if (new Headers(init?.headers).get('Range') === 'bytes=-128') {
      throw new TypeError('fallback offline');
    }
    return rangeResponse(Buffer.alloc(256), init);
  });
  await assert.rejects(loadMp3Metadata('/song.mp3'), /fallback offline/);
});

test('optional ID3v1 failure retains useful ID3v2 data', async (t) => {
  const bytes = id3Tag([['TIT2', textFrame('Song')]]);
  t.mock.method(globalThis, 'fetch', async (_src: unknown, init?: RequestInit) => {
    if (new Headers(init?.headers).get('Range') === 'bytes=-128') {
      throw new TypeError('optional fallback offline');
    }
    return rangeResponse(bytes, init);
  });
  assert.deepEqual(await loadMp3Metadata('/song.mp3'), { title: 'Song' });
});

test('cancellation propagates through the full-tag request without starting a fallback', async (t) => {
  const bytes = id3Tag([['TIT2', textFrame('Song')]]);
  const controller = new AbortController();
  const signals: (AbortSignal | null | undefined)[] = [];
  t.mock.method(globalThis, 'fetch', async (_src: unknown, init?: RequestInit) => {
    signals.push(init?.signal);
    if (signals.length === 1) return rangeResponse(bytes, init);
    return await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    });
  });

  const pending = loadMp3Metadata('/song.mp3', controller.signal);
  await setImmediate();
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.deepEqual(signals, [controller.signal, controller.signal]);
});

test('cancellation closes a prefix stream when the server ignores Range', async (t) => {
  const controller = new AbortController();
  let canceled = false;
  t.mock.method(globalThis, 'fetch', async () => {
    return new Response(
      new ReadableStream({
        cancel() {
          canceled = true;
        },
      }),
      { status: 200 }
    );
  });

  const pending = loadMp3Metadata('/song.mp3', controller.signal);
  await setImmediate();
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(canceled, true);
});

test('abort during optional fallback rejects and revokes the already parsed cover', async (t) => {
  const bytes = id3Tag([
    ['TIT2', textFrame('Song')],
    ['APIC', coverFrame()],
  ]);
  const controller = new AbortController();
  const revoked: string[] = [];
  t.mock.method(URL, 'createObjectURL', () => 'blob:parsed-cover');
  t.mock.method(URL, 'revokeObjectURL', (url: string) => revoked.push(url));
  t.mock.method(globalThis, 'fetch', async (_src: unknown, init?: RequestInit) => {
    if (new Headers(init?.headers).get('Range') === 'bytes=-128') {
      controller.abort();
      throw controller.signal.reason;
    }
    return rangeResponse(bytes, init);
  });

  await assert.rejects(loadMp3Metadata('/song.mp3', controller.signal), { name: 'AbortError' });
  assert.deepEqual(revoked, ['blob:parsed-cover']);
});

test('disabled metadata makes no requests and rapid song changes debounce to the last selection', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const requested: string[] = [];
  const controller = createTrackMetadataController(async (audio) => {
    requested.push(audio);
    return { title: audio };
  });
  t.after(controller.dispose);

  controller.setActive('/a.mp3', false);
  controller.retry();
  await advanceDebounce(t);
  assert.deepEqual(requested, []);

  controller.setActive('/a.mp3', true);
  t.mock.timers.tick(199);
  controller.setActive('/b.mp3', true);
  await advanceDebounce(t);
  assert.deepEqual(requested, ['/b.mp3']);
  assert.equal(controller.getSnapshot().metadataByAudio['/b.mp3'].title, '/b.mp3');
});

test('failed metadata retries explicitly or after re-enabling, without automatic retry loops', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let attempts = 0;
  const controller = createTrackMetadataController(async () => {
    attempts += 1;
    if (attempts < 3) throw new TypeError('offline');
    return {};
  });
  t.after(controller.dispose);

  controller.setActive('/song.mp3', true);
  await advanceDebounce(t);
  assert.deepEqual(controller.getSnapshot().metadataByAudio, {});
  assert.equal(controller.getSnapshot().loadingAudio, undefined);
  await advanceDebounce(t);
  assert.equal(attempts, 1);

  controller.retry();
  await advanceDebounce(t);
  assert.equal(attempts, 2);
  controller.setActive('/song.mp3', false);
  controller.setActive('/song.mp3', true);
  await advanceDebounce(t);
  assert.equal(attempts, 3);
  assert.deepEqual(controller.getSnapshot().metadataByAudio['/song.mp3'], {});

  controller.retry();
  controller.setActive('/song.mp3', false);
  controller.setActive('/song.mp3', true);
  await advanceDebounce(t);
  assert.equal(attempts, 3, 'A successful tagless result must also stay cached');
});

test('switching tracks aborts the old request and releases late results without clearing the new request', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = new Map<
    string,
    { signal?: AbortSignal; resolve: (value: Mp3Metadata) => void }
  >();
  const revoked: string[] = [];
  t.mock.method(URL, 'revokeObjectURL', (url: string) => revoked.push(url));
  const controller = createTrackMetadataController(
    (audio, signal) =>
      new Promise<Mp3Metadata>((resolve) => {
        pending.set(audio, { signal, resolve });
      })
  );
  t.after(controller.dispose);

  controller.setActive('/a.mp3', true);
  await advanceDebounce(t);
  controller.setActive('/b.mp3', true);
  assert.equal(pending.get('/a.mp3')?.signal?.aborted, true);
  await advanceDebounce(t);
  pending.get('/a.mp3')!.resolve({ coverUrl: 'blob:stale-a' });
  await setImmediate();
  assert.deepEqual(revoked, ['blob:stale-a']);
  assert.equal(controller.getSnapshot().loadingAudio, '/b.mp3');
  assert.deepEqual(controller.getSnapshot().metadataByAudio, {});

  pending.get('/b.mp3')!.resolve({ title: 'B' });
  await setImmediate();
  assert.equal(controller.getSnapshot().loadingAudio, undefined);
  assert.deepEqual(controller.getSnapshot().metadataByAudio, { '/b.mp3': { title: 'B' } });
});

test('cache eviction releases the least recently visited cover and revisiting reloads it', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const revoked: string[] = [];
  const requested: string[] = [];
  t.mock.method(URL, 'revokeObjectURL', (url: string) => revoked.push(url));
  const controller = createTrackMetadataController(async (audio) => {
    requested.push(audio);
    return { title: audio, coverUrl: `blob:${audio}` };
  });
  t.after(controller.dispose);

  for (let index = 0; index < 30; index += 1) {
    controller.setActive(String(index), true);
    await advanceDebounce(t);
  }
  controller.setActive('0', true);
  controller.setActive('30', true);
  await advanceDebounce(t);
  assert.equal(Object.keys(controller.getSnapshot().metadataByAudio).length, 30);
  assert.ok(controller.getSnapshot().metadataByAudio['0']);
  assert.equal(controller.getSnapshot().metadataByAudio['1'], undefined);
  assert.deepEqual(revoked, ['blob:1']);

  controller.setActive('1', true);
  await advanceDebounce(t);
  assert.equal(requested.filter((audio) => audio === '1').length, 2);
  assert.ok(controller.getSnapshot().metadataByAudio['1']);
});

test('dispose releases cached and late covers and permits a fresh activation after effect remount', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolvePending: ((metadata: Mp3Metadata) => void) | undefined;
  const revoked: string[] = [];
  t.mock.method(URL, 'revokeObjectURL', (url: string) => revoked.push(url));
  const controller = createTrackMetadataController(async (audio) => {
    if (audio === '/pending.mp3') {
      return await new Promise<Mp3Metadata>((resolve) => {
        resolvePending = resolve;
      });
    }
    return { coverUrl: 'blob:cached' };
  });
  t.after(controller.dispose);

  controller.setActive('/cached.mp3', true);
  await advanceDebounce(t);
  controller.setActive('/pending.mp3', true);
  await advanceDebounce(t);
  controller.dispose();
  resolvePending!({ coverUrl: 'blob:late' });
  await setImmediate();
  assert.deepEqual(revoked, ['blob:cached', 'blob:late']);
  assert.deepEqual(controller.getSnapshot().metadataByAudio, {});

  controller.setActive('/cached.mp3', true);
  await advanceDebounce(t);
  assert.deepEqual(controller.getSnapshot().metadataByAudio['/cached.mp3'], {
    coverUrl: 'blob:cached',
  });
});
