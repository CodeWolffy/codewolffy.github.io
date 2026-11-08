import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addMusicFiles,
  maxAudioFileBytes,
  musicPublicDirectory,
  parseMusicFiles,
  removeMusicFile,
  serializeMusicFiles,
  validateMusicFiles,
} from '../src/components/keystatic/music-files';

function upload(name: string, contents: number[] = [1, 2, 3]) {
  return new File([new Uint8Array(contents)], name);
}

test('an existing song can be removed and re-added without replacing its stored bytes', async () => {
  const bytes = new Uint8Array([8, 9]);
  const parsed = parseMusicFiles(['/music/song.mp3'], new Map([['song.mp3', bytes]]));
  const removed = removeMusicFile(parsed, 0);
  const result = await addMusicFiles(removed, [upload('song.mp3', [0])]);
  assert.equal(result.status.added, 1);
  assert.equal(result.value.files[0].content, bytes);
  const serialized = serializeMusicFiles(result.value);
  assert.deepEqual(serialized.value, ['/music/song.mp3']);
  assert.equal(serialized.external.get(musicPublicDirectory)?.get('song.mp3'), bytes);
  assert.equal(parsed.files.length, 1);
});

test('newly uploaded bytes survive removal and re-adding in the same edit session', async () => {
  const first = await addMusicFiles(parseMusicFiles([]), [upload('new.mp3', [4, 5, 6])]);
  const bytes = first.value.files[0].content;
  const removed = removeMusicFile(first.value, 0);
  const restored = await addMusicFiles(removed, [upload('new.mp3', [0])]);
  assert.equal(restored.value.files[0].content, bytes);
  assert.deepEqual([...restored.value.files[0].content!], [4, 5, 6]);
  assert.deepEqual(serializeMusicFiles(removed).value, []);
  assert.equal(serializeMusicFiles(removed).external.get(musicPublicDirectory)?.size, 0);
});

test('only current playlist entries are duplicates; unselected existing resources can be reused', async () => {
  const bytes = new Uint8Array([7]);
  const initial = parseMusicFiles([], new Map([['Song.mp3', bytes]]));
  const result = await addMusicFiles(initial, [upload('song.mp3'), upload('SONG.MP3')]);
  assert.deepEqual(result.status, { added: 1, duplicate: 1, invalid: 0, oversized: 0 });
  assert.equal(result.value.files[0].relativePath, 'Song.mp3');
  assert.equal(result.value.files[0].content, bytes);
});

test('invalid extensions and over-budget files are rejected before reading their bytes', async () => {
  let reads = 0;
  const read = async () => {
    reads++;
    return new ArrayBuffer(0);
  };
  const result = await addMusicFiles(parseMusicFiles([]), [
    { name: 'audio.wav', size: 1, arrayBuffer: read },
    { name: 'huge.mp3', size: maxAudioFileBytes + 1, arrayBuffer: read },
    { name: 'allowed.MP3', size: maxAudioFileBytes, arrayBuffer: read },
  ]);
  assert.equal(reads, 1);
  assert.deepEqual(result.status, { added: 1, duplicate: 0, invalid: 1, oversized: 1 });
});

test('the serialized byte count is validated even if file metadata was inaccurate', async () => {
  const oversized = new Uint8Array(maxAudioFileBytes + 1);
  const result = await addMusicFiles(parseMusicFiles([]), [
    { name: 'song.mp3', size: 1, arrayBuffer: async () => oversized.buffer },
  ]);
  assert.equal(result.status.oversized, 1);
  assert.equal(result.value.files.length, 0);
  const parsed = parseMusicFiles(['/music/large.mp3'], new Map([['large.mp3', oversized]]));
  assert.throws(() => validateMusicFiles(parsed), /MiB/);
  assert.throws(() => serializeMusicFiles(parsed), /MiB/);
});

test('a failed file read leaves the previous selection and resources unchanged', async () => {
  const initial = parseMusicFiles(
    ['/music/existing.mp3'],
    new Map([['existing.mp3', new Uint8Array([1])]])
  );
  await assert.rejects(
    addMusicFiles(initial, [
      upload('new.mp3'),
      {
        name: 'broken.mp3',
        size: 1,
        arrayBuffer: async () => {
          throw new Error('read failed');
        },
      },
    ]),
    /read failed/
  );
  assert.equal(initial.files.length, 1);
  assert.equal(initial.availableFiles.length, 1);
});

test('external URLs and unselected resources keep the existing serialization semantics', () => {
  const parsed = parseMusicFiles(
    ['https://example.com/song.mp3', '/music/selected.mp3'],
    new Map([
      ['selected.mp3', new Uint8Array([1])],
      ['other.mp3', new Uint8Array([2])],
    ])
  );
  const serialized = serializeMusicFiles(parsed);
  assert.deepEqual(serialized.value, ['https://example.com/song.mp3', '/music/selected.mp3']);
  assert.deepEqual([...serialized.external.get(musicPublicDirectory)!.keys()], ['selected.mp3']);
});

test('resource caching only marks selected files as used for Keystatic deletion tracking', () => {
  const used = new Set<string>();
  class TrackedMap extends Map<string, Uint8Array> {
    override get(key: string) {
      used.add(key);
      return super.get(key);
    }
  }
  const external = new TrackedMap([
    ['selected.mp3', new Uint8Array([1])],
    ['other.mp3', new Uint8Array([2])],
  ]);
  const parsed = parseMusicFiles(['/music/selected.mp3'], external);
  assert.deepEqual([...used], ['selected.mp3']);
  assert.equal(parsed.availableFiles.length, 2);
});
