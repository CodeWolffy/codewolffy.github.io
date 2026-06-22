const FETCH_TIMEOUT_MS = 15000;
const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 0.75;
export const MAX_FILENAME_LENGTH = 50;
export const IMAGE_FETCH_CONCURRENCY = 4;

const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml)(?:;[^,]*)?,/i;

export interface ImageMatch {
  full: string;
  alt: string;
  src: string;
  index: number;
}

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const getFileName = (title: string, ext: string) => {
  const safeName = title.replace(/[<>:"/\\|?*]/g, '_').trim() || 'untitled';
  return `${safeName.slice(0, MAX_FILENAME_LENGTH)}.${ext}`;
};

const fetchWithTimeout = async (url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const isSafeImageUrl = (url: string): boolean => {
  const value = url.trim();
  if (!value) return false;
  if (IMAGE_DATA_URL_PATTERN.test(value)) return true;
  if (value.startsWith('data:')) return false;

  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.href : 'https://example.invalid/';
    const parsed = new URL(value, baseUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const resolveImageUrl = (src: string): string => {
  const value = src.trim();
  if (!isSafeImageUrl(value)) return '';
  if (IMAGE_DATA_URL_PATTERN.test(value)) return value;

  try {
    return new URL(value, window.location.href).href;
  } catch {
    return '';
  }
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onabort = () => reject(new Error('读取图片被中断'));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

const compressImageBlob = async (blob: Blob): Promise<Blob> => {
  if (blob.type === 'image/svg+xml') return blob;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const ratio = width / height;

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          width = MAX_IMAGE_DIMENSION;
          height = width / ratio;
        } else {
          height = MAX_IMAGE_DIMENSION;
          width = height * ratio;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(blob);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (compressedBlob) => {
          URL.revokeObjectURL(url);
          resolve(compressedBlob ?? blob);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    img.src = url;
  });
};

export const fetchImageBlob = async (url: string): Promise<Blob | null> => {
  if (!isSafeImageUrl(url)) {
    console.warn('Unsafe image URL skipped:', url);
    return null;
  }

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } catch (error) {
    console.warn('Image fetch failed:', url, error);
    return null;
  }
};

export const urlToBase64 = async (url: string, shouldCompress = false): Promise<string> => {
  try {
    if (IMAGE_DATA_URL_PATTERN.test(url)) return url;
    if (!isSafeImageUrl(url)) {
      console.warn('Unsafe image URL skipped:', url);
      return url;
    }

    const blob = await fetchImageBlob(url);
    if (!blob) return url;

    const finalBlob = shouldCompress ? await compressImageBlob(blob) : blob;
    return await blobToBase64(finalBlob);
  } catch {
    return url;
  }
};

export const findMarkdownImages = (content: string): ImageMatch[] => {
  const regex = /!\[(.*?)\]\((.*?)\)/g;
  const matches: ImageMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      full: match[0],
      alt: match[1],
      src: match[2],
      index: match.index,
    });
  }

  return matches;
};

export const replaceOutsideCodeBlocks = (
  content: string,
  regex: RegExp,
  replacer: (match: string, ...args: string[]) => string
): string => {
  const fenceRegex = /(```[\s\S]*?```|`[^`\n]*`)/g;
  const fences: Array<{ start: number; end: number }> = [];
  let fenceMatch: RegExpExecArray | null;

  while ((fenceMatch = fenceRegex.exec(content)) !== null) {
    fences.push({ start: fenceMatch.index, end: fenceMatch.index + fenceMatch[0].length });
  }

  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const matcher = new RegExp(regex.source, flags);
  let result = '';
  let lastIndex = 0;
  let contentMatch: RegExpExecArray | null;

  while ((contentMatch = matcher.exec(content)) !== null) {
    const matchStart = contentMatch.index;
    const matchEnd = matchStart + contentMatch[0].length;
    const insideFence = fences.some((fence) => matchStart >= fence.start && matchEnd <= fence.end);

    if (!insideFence) {
      result += content.slice(lastIndex, matchStart);
      result += replacer(contentMatch[0], ...contentMatch.slice(1));
      lastIndex = matchEnd;
    }

    if (contentMatch[0].length === 0) matcher.lastIndex += 1;
  }

  result += content.slice(lastIndex);
  return result;
};

export const fixIframesOutsideCodeBlocks = (content: string): string =>
  replaceOutsideCodeBlocks(content, /<iframe\s+([^>]*)>/g, (_match, attributes: string) => {
    const cleaned = attributes
      .replace(/\s+height=["'][^"']*["']/g, '')
      .replace(/\s+style=["'][^"']*["']/g, '');
    return `<iframe${cleaned} height="450" style="width: 100%; min-height: 450px; border: 0;">`;
  });

export const restoreMermaidBlocks = (content: string): string =>
  content.replace(
    /<Mermaid\s+code=\{\{\s*value\s*:\s*(['"])([\s\S]*?)\1\s*,?\s*\}\}\s*\/>/g,
    (_match, _quote: string, codeValue: string) => {
      const decoded = codeValue
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
      return `\`\`\`mermaid\n${decoded}\n\`\`\``;
    }
  );

export const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  if (items.length === 0) return [];

  const limit = Math.max(1, Math.min(items.length, Math.floor(concurrency)));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index], index);
      }
    })
  );

  return results;
};

export const EXPORT_HTML_STYLES = `
/* Basic Reset & Typography */
body { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #374151; }
img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5em 0; }
pre { background: #f3f4f6; padding: 1em; border-radius: 6px; overflow-x: auto; }
code { font-family: 'Fira Code', 'Consolas', monospace; background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
pre code { background: none; padding: 0; font-size: 0.9em; color: #333; }
blockquote { border-left: 4px solid #e5e7eb; padding-left: 1em; color: #6b7280; margin: 1.5em 0; }
table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; }
th, td { border: 1px solid #e5e7eb; padding: 0.75em; text-align: left; }
a { color: #2563eb; text-decoration: none; }
h1 { font-size: 2.25em; margin-bottom: 0.5em; color: #111827; font-weight: 700; }
h2 { font-size: 1.5em; margin-top: 1.5em; margin-bottom: 1em; color: #1f2937; font-weight: 600; }
h3 { font-size: 1.25em; margin-top: 1.5em; margin-bottom: 0.75em; color: #1f2937; font-weight: 600; }
.meta { color: #6b7280; margin-bottom: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 1em; }
.cover-img { width: 100%; max-height: 400px; object-fit: cover; margin-bottom: 2em; border-radius: 8px; }

/* Video Container */
.video-container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; margin: 1.5em 0; border-radius: 8px; overflow: hidden; background: #f3f4f6; }
.video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

/* Mermaid Overrides */
.mermaid-container { margin: 1.5em 0; background: transparent !important; border: none !important; }
.mermaid-content { padding: 0 !important; display: flex; justify-content: center; }
.mermaid svg { max-width: 100% !important; height: auto !important; background-color: white; }

/* Callout Tailwind Shim */
.flex { display: flex; }
.items-start { align-items: flex-start; }
.gap-3 { gap: 0.75rem; }
.my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
.my-4 { margin-top: 1rem; margin-bottom: 1rem; }
.p-4 { padding: 1rem; }
.rounded-lg { border-radius: 0.5rem; }
.border { border-width: 1px; }
.w-full { width: 100%; }
.min-w-0 { min-width: 0; }
.leading-relaxed { line-height: 1.625; }
.mt-0.5 { margin-top: 0.125rem; }
.shrink-0 { flex-shrink: 0; }
.mb-1 { margin-bottom: 0.25rem; }
.font-medium { font-weight: 500; }

/* Info */
.bg-blue-50 { background-color: #eff6ff; }
.text-blue-900 { color: #1e3a8a; }
.border-blue-200 { border-color: #bfdbfe; }
.text-blue-600 { color: #2563eb; }

/* Tip */
.bg-emerald-50 { background-color: #ecfdf5; }
.text-emerald-900 { color: #064e3b; }
.border-emerald-200 { border-color: #a7f3d0; }
.text-emerald-600 { color: #059669; }

/* Warning */
.bg-amber-50 { background-color: #fffbeb; }
.text-amber-900 { color: #78350f; }
.border-amber-200 { border-color: #fde68a; }
.text-amber-600 { color: #d97706; }

/* Danger */
.bg-red-50 { background-color: #fef2f2; }
.text-red-900 { color: #7f1d1d; }
.border-red-200 { border-color: #fecaca; }
.text-red-600 { color: #dc2626; }
`;