export type SyncedLyricLine = {
  time: number;
  text: string;
};

export type Mp3Metadata = {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  lyrics?: string;
  syncedLyrics?: SyncedLyricLine[];
};

const ID3_HEADER_SIZE = 10;
const ID3V1_TAG_SIZE = 128;
const ID3V2_2_FRAME_HEADER_SIZE = 6;
const ID3V2_3_FRAME_HEADER_SIZE = 10;
const MAX_ID3_TAG_SIZE = 16 * 1024 * 1024;
const TIMED_LYRIC_LINE_PATTERN = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const TIMED_LYRIC_TEST_PATTERN = /\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/;
const LYRICS_DESCRIPTION_PATTERN = /(?:lyric|lrc|synced|unsynced|歌词)/i;
const TEXT_DECODER_CACHE = new Map<string, TextDecoder>();

type ParsedFrame = {
  id: string;
  data: Uint8Array;
  next: number;
};

const getDecoder = (encoding: string) => {
  const cached = TEXT_DECODER_CACHE.get(encoding);
  if (cached) return cached;
  const decoder = new TextDecoder(encoding, { fatal: false });
  TEXT_DECODER_CACHE.set(encoding, decoder);
  return decoder;
};

const decodeSyncSafeInteger = (bytes: Uint8Array) =>
  ((bytes[0] & 0x7f) << 21) |
  ((bytes[1] & 0x7f) << 14) |
  ((bytes[2] & 0x7f) << 7) |
  (bytes[3] & 0x7f);

const decodeUint32 = (bytes: Uint8Array) =>
  ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];

const decodeUint24 = (bytes: Uint8Array) => (bytes[0] << 16) + (bytes[1] << 8) + bytes[2];

const removeUnsynchronization = (bytes: Uint8Array) => {
  const data: number[] = [];

  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0xff && bytes[index + 1] === 0x00) {
      data.push(0xff);
      index += 1;
      continue;
    }

    data.push(bytes[index]);
  }

  return new Uint8Array(data);
};

const decodeLatin1 = (bytes: Uint8Array) => getDecoder('latin1').decode(bytes);

const normalizeText = (value: string) => value.replace(/\0+$/g, '').trim();

const preferTimedLyrics = (current: string | undefined, candidate: string | undefined) => {
  if (!candidate) return current;
  if (!current) return candidate;
  return TIMED_LYRIC_TEST_PATTERN.test(candidate) && !TIMED_LYRIC_TEST_PATTERN.test(current)
    ? candidate
    : current;
};

const getTextTerminatorLength = (encoding: number) => (encoding === 1 || encoding === 2 ? 2 : 1);

const findTextTerminator = (bytes: Uint8Array, start: number, encoding: number) => {
  const length = getTextTerminatorLength(encoding);

  for (let index = start; index <= bytes.length - length; index += length) {
    if (length === 1 && bytes[index] === 0) return index;
    if (length === 2 && bytes[index] === 0 && bytes[index + 1] === 0) return index;
  }

  return -1;
};

const readNullTerminatedLatin1 = (bytes: Uint8Array, start: number) => {
  const end = bytes.indexOf(0, start);
  const safeEnd = end === -1 ? bytes.length : end;

  return {
    value: decodeLatin1(bytes.subarray(start, safeEnd)).trim(),
    next: end === -1 ? bytes.length : end + 1,
  };
};

const decodeTextBytes = (bytes: Uint8Array, encoding: number) => {
  if (bytes.length === 0) return '';

  if (encoding === 0) return normalizeText(decodeLatin1(bytes));
  if (encoding === 3) return normalizeText(getDecoder('utf-8').decode(bytes));
  if (encoding === 2) return normalizeText(getDecoder('utf-16be').decode(bytes));

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return normalizeText(getDecoder('utf-16le').decode(bytes.subarray(2)));
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return normalizeText(getDecoder('utf-16be').decode(bytes.subarray(2)));
  }

  return normalizeText(getDecoder('utf-16le').decode(bytes));
};

const readEncodedText = (bytes: Uint8Array, start: number, encoding: number) => {
  const end = findTextTerminator(bytes, start, encoding);
  const safeEnd = end === -1 ? bytes.length : end;

  return {
    value: decodeTextBytes(bytes.subarray(start, safeEnd), encoding),
    next: end === -1 ? bytes.length : end + getTextTerminatorLength(encoding),
  };
};

const decodeTextFrame = (frame: Uint8Array) => {
  const encoding = frame[0] ?? 0;
  return decodeTextBytes(frame.subarray(1), encoding)
    .split('\0')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' / ');
};

const parseUnsynchronizedLyrics = (frame: Uint8Array) => {
  const encoding = frame[0] ?? 0;
  const text = readEncodedText(frame, 4, encoding);
  return decodeTextBytes(frame.subarray(text.next), encoding) || text.value;
};

const parseCommentFrame = (frame: Uint8Array) => {
  const encoding = frame[0] ?? 0;
  const description = readEncodedText(frame, 4, encoding);
  const value = decodeTextBytes(frame.subarray(description.next), encoding);

  return {
    description: description.value,
    value,
  };
};

const parseUserTextFrame = (frame: Uint8Array) => {
  const encoding = frame[0] ?? 0;
  const description = readEncodedText(frame, 1, encoding);
  const value = decodeTextBytes(frame.subarray(description.next), encoding);

  return {
    description: description.value,
    value,
  };
};

const parseSynchronizedLyrics = (frame: Uint8Array): SyncedLyricLine[] => {
  const encoding = frame[0] ?? 0;
  const timestampFormat = frame[4];
  let cursor = 6;

  cursor = readEncodedText(frame, cursor, encoding).next;

  const lines: SyncedLyricLine[] = [];
  while (cursor < frame.length - 4) {
    const text = readEncodedText(frame, cursor, encoding);
    cursor = text.next;
    if (cursor + 4 > frame.length) break;

    const rawTime = decodeUint32(frame.subarray(cursor, cursor + 4));
    cursor += 4;

    if (!text.value) continue;

    lines.push({
      time: timestampFormat === 2 ? rawTime / 1000 : rawTime,
      text: text.value,
    });
  }

  return lines.sort((a, b) => a.time - b.time);
};

const parseAttachedPicture = (frame: Uint8Array, majorVersion: number) => {
  const encoding = frame[0] ?? 0;
  const mime =
    majorVersion === 2
      ? {
          value: `image/${decodeLatin1(frame.subarray(1, 4)).toLowerCase().replace('jpg', 'jpeg')}`,
          next: 4,
        }
      : readNullTerminatedLatin1(frame, 1);
  const descriptionStart = mime.next + 1;
  const description = readEncodedText(frame, descriptionStart, encoding);
  const imageBytes = frame.subarray(description.next);

  if (!mime.value || imageBytes.length === 0) return undefined;

  const imageBuffer = imageBytes.buffer.slice(
    imageBytes.byteOffset,
    imageBytes.byteOffset + imageBytes.byteLength
  ) as ArrayBuffer;

  return URL.createObjectURL(new Blob([imageBuffer], { type: mime.value }));
};

const parseTimedLyrics = (lyrics?: string): SyncedLyricLine[] => {
  if (!lyrics) return [];

  return lyrics
    .split(/\r?\n/)
    .flatMap((line) => {
      const tags = Array.from(line.matchAll(TIMED_LYRIC_LINE_PATTERN));
      const text = line.replace(TIMED_LYRIC_LINE_PATTERN, '').trim();

      TIMED_LYRIC_LINE_PATTERN.lastIndex = 0;

      return tags
        .filter(() => text.length > 0)
        .map((match) => {
          const minutes = Number(match[1]);
          const seconds = Number(match[2]);
          const fraction = match[3] ?? '0';
          const milliseconds = Number(fraction.padEnd(3, '0').slice(0, 3));

          return {
            time: minutes * 60 + seconds + milliseconds / 1000,
            text,
          };
        });
    })
    .sort((a, b) => a.time - b.time);
};

const parseFrame = (
  tag: Uint8Array,
  cursor: number,
  tagEnd: number,
  majorVersion: number
): ParsedFrame | undefined => {
  if (majorVersion === 2) {
    if (cursor + ID3V2_2_FRAME_HEADER_SIZE > tagEnd) return undefined;

    const id = decodeLatin1(tag.subarray(cursor, cursor + 3));
    if (!/^[A-Z0-9]{3}$/.test(id)) return undefined;

    const size = decodeUint24(tag.subarray(cursor + 3, cursor + 6));
    const start = cursor + ID3V2_2_FRAME_HEADER_SIZE;
    const end = start + size;
    if (size <= 0 || end > tagEnd) return undefined;

    return {
      id,
      data: tag.subarray(start, end),
      next: end,
    };
  }

  if (cursor + ID3V2_3_FRAME_HEADER_SIZE > tagEnd) return undefined;

  const id = decodeLatin1(tag.subarray(cursor, cursor + 4));
  if (!/^[A-Z0-9]{4}$/.test(id)) return undefined;

  const size =
    majorVersion === 4
      ? decodeSyncSafeInteger(tag.subarray(cursor + 4, cursor + 8))
      : decodeUint32(tag.subarray(cursor + 4, cursor + 8));
  const start = cursor + ID3V2_3_FRAME_HEADER_SIZE;
  const end = start + size;
  if (size <= 0 || end > tagEnd) return undefined;

  return {
    id,
    data: tag.subarray(start, end),
    next: end,
  };
};

const applyFrameToMetadata = (
  metadata: Mp3Metadata,
  syncedLyrics: SyncedLyricLine[],
  frame: ParsedFrame,
  majorVersion: number
) => {
  if (frame.id === 'TIT2' || frame.id === 'TT2') metadata.title ||= decodeTextFrame(frame.data);
  if (frame.id === 'TPE1' || frame.id === 'TP1') metadata.artist ||= decodeTextFrame(frame.data);
  if (frame.id === 'TALB' || frame.id === 'TAL') metadata.album ||= decodeTextFrame(frame.data);

  if (frame.id === 'USLT' || frame.id === 'ULT') {
    metadata.lyrics = preferTimedLyrics(metadata.lyrics, parseUnsynchronizedLyrics(frame.data));
  }

  if (frame.id === 'SYLT' || frame.id === 'SLT') {
    syncedLyrics.push(...parseSynchronizedLyrics(frame.data));
  }

  if (frame.id === 'COMM' || frame.id === 'COM') {
    const comment = parseCommentFrame(frame.data);
    if (
      TIMED_LYRIC_TEST_PATTERN.test(comment.value) ||
      LYRICS_DESCRIPTION_PATTERN.test(comment.description)
    ) {
      metadata.lyrics = preferTimedLyrics(metadata.lyrics, comment.value);
    }
  }

  if (frame.id === 'TXXX' || frame.id === 'TXX') {
    const userText = parseUserTextFrame(frame.data);
    if (
      TIMED_LYRIC_TEST_PATTERN.test(userText.value) ||
      LYRICS_DESCRIPTION_PATTERN.test(userText.description)
    ) {
      metadata.lyrics = preferTimedLyrics(metadata.lyrics, userText.value);
    }
  }

  if ((frame.id === 'APIC' || frame.id === 'PIC') && !metadata.coverUrl) {
    metadata.coverUrl = parseAttachedPicture(frame.data, majorVersion);
  }
};

const readPrefixBytes = async (response: Response, limit: number): Promise<Uint8Array> => {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer).subarray(0, limit);
  }

  const chunks: Uint8Array[] = [];
  let receivedLength = 0;
  try {
    while (receivedLength < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // 忽略取消流时的错误
    }
  }

  const result = new Uint8Array(receivedLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.subarray(0, limit);
};

const fetchBytes = async (src: string, range?: string) => {
  const response = await fetch(src, range ? { headers: { Range: range } } : undefined);

  if (!response.ok) {
    throw new Error(`无法读取 MP3 文件：${response.status}`);
  }

  if (range && response.status !== 206) {
    if (response.status === 200) {
      const match = range.match(/bytes=(\d+)-(\d+)?/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : null;
        if (start === 0 && end !== null) {
          const limit = end + 1;
          return await readPrefixBytes(response, limit);
        }
      }

      if (range.includes('=-') || range.startsWith('bytes=-')) {
        await response.body?.cancel().catch(() => {});
        return new Uint8Array(0);
      }
    }

    await response.body?.cancel().catch(() => {});
    throw new Error(`服务器未按 Range 返回 MP3 片段，且状态码非 200：${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
};

const fetchId3Tag = async (src: string) => {
  const headerBytes = await fetchBytes(src, `bytes=0-${ID3_HEADER_SIZE - 1}`);
  if (headerBytes.length < ID3_HEADER_SIZE) return undefined;

  const marker = decodeLatin1(headerBytes.subarray(0, 3));
  if (marker !== 'ID3') return undefined;

  const tagSize = decodeSyncSafeInteger(headerBytes.subarray(6, 10));
  if (tagSize <= 0 || tagSize > MAX_ID3_TAG_SIZE) return undefined;

  const fullTag = await fetchBytes(src, `bytes=0-${ID3_HEADER_SIZE + tagSize - 1}`);
  return fullTag.length >= ID3_HEADER_SIZE + tagSize
    ? fullTag
    : fullTag.subarray(0, ID3_HEADER_SIZE + tagSize);
};

const fetchId3v1Metadata = async (src: string): Promise<Mp3Metadata> => {
  try {
    const bytes = await fetchBytes(src, `bytes=-${ID3V1_TAG_SIZE}`);
    if (bytes.length < ID3V1_TAG_SIZE) return {};

    const tag = bytes.subarray(bytes.length - ID3V1_TAG_SIZE);
    if (decodeLatin1(tag.subarray(0, 3)) !== 'TAG') return {};

    return {
      title: normalizeText(decodeLatin1(tag.subarray(3, 33))),
      artist: normalizeText(decodeLatin1(tag.subarray(33, 63))),
      album: normalizeText(decodeLatin1(tag.subarray(63, 93))),
    };
  } catch {
    return {};
  }
};

const mergeMetadata = (primary: Mp3Metadata, fallback: Mp3Metadata): Mp3Metadata => ({
  title: primary.title || fallback.title,
  artist: primary.artist || fallback.artist,
  album: primary.album || fallback.album,
  coverUrl: primary.coverUrl || fallback.coverUrl,
  lyrics: primary.lyrics || fallback.lyrics,
  syncedLyrics: primary.syncedLyrics?.length ? primary.syncedLyrics : fallback.syncedLyrics,
});

export const getFallbackMetadata = (
  src: string
): Required<Pick<Mp3Metadata, 'title' | 'artist'>> => {
  const filename = src.split('/').pop()?.split('?')[0] ?? '';
  const rawName = decodeURIComponent(filename.replace(/\.[^.]+$/, '') || '').trim();
  if (!rawName) {
    return {
      title: '未命名音乐',
      artist: '未知艺术家',
    };
  }

  const match = rawName.match(/^(.*?)\s*[-—]\s*(.*?)$/);
  if (match && match[1]?.trim() && match[2]?.trim()) {
    return {
      title: match[1].trim(),
      artist: match[2].trim(),
    };
  }

  return {
    title: rawName,
    artist: '未知艺术家',
  };
};

export const loadMp3Metadata = async (src: string): Promise<Mp3Metadata> => {
  try {
    const tag = await fetchId3Tag(src).catch(() => undefined);
    if (!tag) {
      return await fetchId3v1Metadata(src).catch(() => ({}));
    }

    const majorVersion = tag[3];
    const flags = tag[5];
    const tagSize = decodeSyncSafeInteger(tag.subarray(6, 10));
    const tagEnd = Math.min(tag.length, ID3_HEADER_SIZE + tagSize);
    let frameSource = tag;
    let frameSourceEnd = tagEnd;
    let cursor = ID3_HEADER_SIZE;

    if ((flags & 0x80) !== 0) {
      const normalizedBody = removeUnsynchronization(tag.subarray(ID3_HEADER_SIZE, tagEnd));
      frameSource = new Uint8Array(ID3_HEADER_SIZE + normalizedBody.length);
      frameSource.set(tag.subarray(0, ID3_HEADER_SIZE), 0);
      frameSource.set(normalizedBody, ID3_HEADER_SIZE);
      frameSourceEnd = frameSource.length;
    }

    if ((flags & 0x40) !== 0 && cursor + 4 <= frameSourceEnd) {
      const extendedHeaderSize =
        majorVersion === 4
          ? decodeSyncSafeInteger(frameSource.subarray(cursor, cursor + 4))
          : decodeUint32(frameSource.subarray(cursor, cursor + 4));
      cursor += majorVersion === 4 ? 4 + extendedHeaderSize : extendedHeaderSize + 4;
    }

    const metadata: Mp3Metadata = {};
    const syncedLyrics: SyncedLyricLine[] = [];

    while (cursor < frameSourceEnd) {
      const frame = parseFrame(frameSource, cursor, frameSourceEnd, majorVersion);
      if (!frame) break;

      applyFrameToMetadata(metadata, syncedLyrics, frame, majorVersion);
      cursor = frame.next;
    }

    const timedLyrics = syncedLyrics.length > 0 ? syncedLyrics : parseTimedLyrics(metadata.lyrics);
    if (timedLyrics.length > 0) metadata.syncedLyrics = timedLyrics;

    if (metadata.title && metadata.artist) return metadata;

    const fallbackV1 = await fetchId3v1Metadata(src).catch(() => ({}));
    return mergeMetadata(metadata, fallbackV1);
  } catch {
    return {};
  }
};
