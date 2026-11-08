import assetBudgets from '../../config/asset-budgets.json';

export const musicPublicDirectory = 'public/music';
const musicPublicPath = '/music/';
export const maxAudioFileBytes = assetBudgets.maxAudioFileBytes;

export type MusicFileItem = {
  path: string;
  filename: string;
  relativePath?: string;
  content?: Uint8Array;
};

export type MusicFilesValue = {
  files: MusicFileItem[];
  // Keep removed resources in memory so re-adding never overwrites their original bytes.
  availableFiles: MusicFileItem[];
};

export type MusicUploadStatus = {
  added: number;
  duplicate: number;
  invalid: number;
  oversized: number;
};

type MusicUpload = Pick<File, 'name' | 'size' | 'arrayBuffer'>;
const isMp3Path = (value: string) => /\.mp3(?:$|[?#])/i.test(value);
const decodePath = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

function normalizeStoredMusicPath(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\\/g, '/');
  if (!trimmed || !isMp3Path(trimmed)) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const withoutPublic = trimmed.replace(/^\/?public\//i, '');
  if (withoutPublic.startsWith('/')) return withoutPublic;
  if (withoutPublic.startsWith('music/')) return `/${withoutPublic}`;
  return `${musicPublicPath}${withoutPublic}`;
}

function getMusicRelativePath(path: string) {
  const pathname = path.split(/[?#]/, 1)[0];
  return pathname.startsWith(musicPublicPath)
    ? decodePath(pathname.slice(musicPublicPath.length)) || undefined
    : undefined;
}

const toMusicPublicPath = (relativePath: string) =>
  `${musicPublicPath}${relativePath.replace(/^\/+/, '')}`;
const getMusicPathKey = (path: string) =>
  decodePath(normalizeStoredMusicPath(path) ?? path)
    .replace(/\\/g, '/')
    .toLowerCase();

function sanitizeMp3Filename(filename: string) {
  return Array.from(filename.normalize('NFC'), (character) =>
    '<>:"/\\|?*'.includes(character) || character.charCodeAt(0) <= 31 ? '-' : character
  )
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeMusicFilesFromStoredValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const item of value) {
    const path = normalizeStoredMusicPath(item);
    if (!path) continue;
    const key = getMusicPathKey(path);
    if (seen.has(key)) continue;
    seen.add(key);
    paths.push(path);
  }
  return paths;
}

export function parseMusicFiles(
  value: unknown,
  externalFiles: ReadonlyMap<string, Uint8Array> = new Map()
): MusicFilesValue {
  const availableFiles = [...externalFiles]
    .filter(([relativePath]) => isMp3Path(relativePath))
    .map(([relativePath, content]) => ({
      path: toMusicPublicPath(relativePath),
      filename: decodePath(relativePath.split('/').pop() || 'MP3 音乐'),
      relativePath,
      content,
    }));
  const files = normalizeMusicFilesFromStoredValue(value).map((path) => {
    const relativePath = getMusicRelativePath(path);
    return {
      path,
      filename: decodePath((relativePath || path).split('/').pop() || 'MP3 音乐'),
      relativePath,
      content: relativePath ? externalFiles.get(relativePath) : undefined,
    };
  });
  return { files, availableFiles };
}

export function removeMusicFile(value: MusicFilesValue, index: number): MusicFilesValue {
  return { ...value, files: value.files.filter((_, itemIndex) => itemIndex !== index) };
}

export async function addMusicFiles(
  value: MusicFilesValue,
  uploads: readonly MusicUpload[]
): Promise<{ value: MusicFilesValue; status: MusicUploadStatus }> {
  const files = [...value.files];
  const availableFiles = [...value.availableFiles];
  const selectedKeys = new Set(files.map((file) => getMusicPathKey(file.path)));
  const resources = new Map(
    [...availableFiles, ...files].map((file) => [getMusicPathKey(file.path), file])
  );
  const status: MusicUploadStatus = { added: 0, duplicate: 0, invalid: 0, oversized: 0 };
  for (const upload of uploads) {
    if (!/\.mp3$/i.test(upload.name)) {
      status.invalid++;
      continue;
    }
    if (upload.size > maxAudioFileBytes) {
      status.oversized++;
      continue;
    }
    const filename = sanitizeMp3Filename(upload.name);
    const path = toMusicPublicPath(filename);
    const key = getMusicPathKey(path);
    if (selectedKeys.has(key)) {
      status.duplicate++;
      continue;
    }
    let file = resources.get(key);
    if (!file?.content) {
      const content = new Uint8Array(await upload.arrayBuffer());
      // Guard the bytes too, rather than relying only on the File metadata.
      if (content.byteLength > maxAudioFileBytes) {
        status.oversized++;
        continue;
      }
      file = { path, filename, relativePath: filename, content };
      availableFiles.push(file);
      resources.set(key, file);
    }
    files.push(file);
    selectedKeys.add(key);
    status.added++;
  }
  return { value: { files, availableFiles }, status };
}

export function validateMusicFiles(value: MusicFilesValue): MusicFilesValue {
  for (const file of value.files) {
    if (!normalizeStoredMusicPath(file.path)) throw new Error('音乐文件必须使用 MP3 格式。');
    if (file.content && file.content.byteLength > maxAudioFileBytes) {
      throw new Error(
        `${file.filename} 超过 ${maxAudioFileBytes / 1024 / 1024} MiB，请移除后重试。`
      );
    }
  }
  return value;
}

export function serializeMusicFiles(value: MusicFilesValue) {
  validateMusicFiles(value);
  const seen = new Set<string>();
  const paths: string[] = [];
  const externalFiles = new Map<string, Uint8Array>();
  for (const file of value.files) {
    const path = normalizeStoredMusicPath(file.path);
    if (!path) continue;
    const key = getMusicPathKey(path);
    if (seen.has(key)) continue;
    seen.add(key);
    paths.push(path);
    if (file.relativePath && file.content) externalFiles.set(file.relativePath, file.content);
  }
  return {
    value: paths,
    other: new Map<string, Uint8Array>(),
    external: new Map<string, ReadonlyMap<string, Uint8Array>>([
      [musicPublicDirectory, externalFiles],
    ]),
  };
}
