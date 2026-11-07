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
  prefix: string;
  suffix: string;
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

export const isSafeImageUrl = (url: string): boolean => {
  const value = url.trim();
  if (!value) return false;
  if (IMAGE_DATA_URL_PATTERN.test(value)) return true;
  if (value.startsWith('data:')) return false;

  try {
    const baseUrl =
      typeof window !== 'undefined' ? window.location.href : 'https://example.invalid/';
    const parsed = new URL(value, baseUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const resolveImageUrl = (src: string): string => {
  const value = src.trim();
  if (!isSafeImageUrl(value)) throw new Error('图片地址无效，已取消导出');
  if (IMAGE_DATA_URL_PATTERN.test(value)) return value;

  try {
    return new URL(value, window.location.href).href;
  } catch (error) {
    throw new Error('无法解析图片地址，已取消导出', { cause: error });
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

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
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
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(new Error('图片转换失败，已取消导出', { cause: error }));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片无法解码，已取消导出'));
    };

    img.src = url;
  });
};

export const fetchImageBlob = async (url: string): Promise<Blob> => {
  if (!isSafeImageUrl(url)) {
    throw new Error('图片地址无效，已取消导出');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Decode embedded images locally: fetch(data:) may itself be blocked by
    // connect-src, even though the page is allowed to display data images.
    if (IMAGE_DATA_URL_PATTERN.test(url)) {
      const comma = url.indexOf(',');
      const header = url.slice(5, comma);
      const payload = url.slice(comma + 1);
      const bytes = /;base64(?:;|$)/i.test(header)
        ? Uint8Array.from(atob(decodeURIComponent(payload)), (char) => char.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(payload));
      if (!bytes.length) throw new Error('图片数据为空');
      return new Blob([bytes], { type: header.split(';')[0] });
    }
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith('image/')) {
      throw new Error('响应不是有效图片');
    }
    return blob;
  } catch (error) {
    throw new Error('图片下载失败，已取消导出；请检查网络或图片访问权限后重试', { cause: error });
  } finally {
    clearTimeout(timer);
  }
};

export const urlToBase64 = async (url: string, shouldCompress = false): Promise<string> => {
  const blob = await fetchImageBlob(url);
  const finalBlob = shouldCompress ? await compressImageBlob(blob) : blob;
  return blobToBase64(finalBlob);
};

type SourceRange = { start: number; end: number };

const isEscaped = (content: string, index: number) => {
  let slashes = 0;
  while (index > 0 && content[--index] === '\\') slashes++;
  return slashes % 2 === 1;
};

// Fences may use tildes or any run of at least three backticks. Code spans must
// close with the same number of backticks, and can contain line breaks.
const getCodeRanges = (content: string): SourceRange[] => {
  const ranges: SourceRange[] = [];
  let fence: { marker: string; length: number; start: number } | undefined;
  for (const line of content.matchAll(/[^\n]*(?:\n|$)/g)) {
    const match = line[0].match(/^(?: {0,3}> ?)* {0,3}(`{3,}|~{3,})([^\n]*)/);
    if (!match) continue;
    if (!fence) {
      if (match[1][0] === '`' && match[2].includes('`')) continue;
      fence = { marker: match[1][0], length: match[1].length, start: line.index };
    } else if (
      match[1][0] === fence.marker &&
      match[1].length >= fence.length &&
      !match[2].trim()
    ) {
      ranges.push({ start: fence.start, end: line.index + line[0].length });
      fence = undefined;
    }
  }
  if (fence) ranges.push({ start: fence.start, end: content.length });

  const ticks = /`+/g;
  let run: RegExpExecArray | null;
  while ((run = ticks.exec(content))) {
    if (isEscaped(content, run.index)) continue;
    const blocked = ranges.find((range) => run!.index >= range.start && run!.index < range.end);
    if (blocked) {
      ticks.lastIndex = blocked.end;
      continue;
    }
    const start = run.index;
    const delimiter = run[0];
    const afterOpening = ticks.lastIndex;
    let closing: RegExpExecArray | null;
    while ((closing = ticks.exec(content))) {
      if (ranges.some((range) => closing!.index >= range.start && closing!.index < range.end)) {
        break;
      }
      if (closing[0] === delimiter) {
        ranges.push({ start, end: ticks.lastIndex });
        break;
      }
    }
    if (!closing || closing[0] !== delimiter) ticks.lastIndex = afterOpening;
  }
  return ranges;
};

const decodeImageDestination = (value: string) =>
  value.replace(/\\([\\()[\]<>])/g, '$1').replace(/&amp;/g, '&');

const parseImageDestination = (content: string, start: number) => {
  let cursor = start;
  while (/\s/.test(content[cursor] || '') && cursor < content.length) cursor++;
  const angled = content[cursor] === '<';
  if (angled) cursor++;
  const sourceStart = cursor;
  let depth = 0;
  while (cursor < content.length) {
    const char = content[cursor];
    if (char === '\\') {
      cursor += 2;
      continue;
    }
    if (angled) {
      if (char === '>') break;
      if (char === '\n' || char === '<') return;
    } else {
      if (char === '(') depth++;
      if (char === ')') {
        if (depth === 0) break;
        depth--;
      }
      if (/\s/.test(char)) break;
    }
    cursor++;
  }
  const sourceEnd = cursor;
  if (depth || (angled && content[cursor] !== '>')) return;
  if (angled) cursor++;
  const destinationEnd = cursor;
  while (/\s/.test(content[cursor] || '') && cursor < content.length) cursor++;
  if (cursor > destinationEnd && ['"', "'", '('].includes(content[cursor])) {
    const closing = content[cursor] === '(' ? ')' : content[cursor];
    cursor++;
    while (cursor < content.length && (content[cursor] !== closing || isEscaped(content, cursor))) {
      cursor++;
    }
    if (content[cursor] !== closing) return;
    cursor++;
    while (/\s/.test(content[cursor] || '') && cursor < content.length) cursor++;
  }
  if (content[cursor] !== ')') return;
  return { sourceStart, sourceEnd, end: cursor + 1 };
};

export const findMarkdownImages = (content: string): ImageMatch[] => {
  const codeRanges = getCodeRanges(content);
  const isCode = (index: number) =>
    codeRanges.some((range) => index >= range.start && index < range.end);
  const normalizeLabel = (label: string) => label.trim().replace(/\s+/g, ' ').toLowerCase();
  const definitions = new Map<string, { src: string; suffix: string }>();
  for (const definition of content.matchAll(/^ {0,3}\[([^\]\n]+)\]:[ \t]*(.+)$/gm)) {
    if (isCode(definition.index)) continue;
    const destination = `(${definition[2].trim()})`;
    const parsed = parseImageDestination(destination, 1);
    const label = normalizeLabel(definition[1]);
    if (parsed && !definitions.has(label)) {
      definitions.set(label, {
        src: decodeImageDestination(destination.slice(parsed.sourceStart, parsed.sourceEnd)),
        suffix: destination.slice(parsed.sourceEnd, parsed.end),
      });
    }
  }

  const matches: ImageMatch[] = [];
  for (let index = 0; index < content.length - 1; index++) {
    if (content.slice(index, index + 2) !== '![' || isEscaped(content, index) || isCode(index))
      continue;
    let cursor = index + 2;
    let depth = 1;
    while (cursor < content.length && depth) {
      if (content[cursor] === '\\') cursor++;
      else if (content[cursor] === '[') depth++;
      else if (content[cursor] === ']') depth--;
      cursor++;
    }
    if (depth) continue;
    const alt = content.slice(index + 2, cursor - 1);
    const altEnd = cursor;
    const parsed = content[cursor] === '(' ? parseImageDestination(content, cursor + 1) : undefined;
    if (parsed) {
      matches.push({
        full: content.slice(index, parsed.end),
        alt,
        index,
        src: decodeImageDestination(content.slice(parsed.sourceStart, parsed.sourceEnd)),
        prefix: content.slice(index, parsed.sourceStart),
        suffix: content.slice(parsed.sourceEnd, parsed.end),
      });
      index = parsed.end - 1;
      continue;
    }
    let reference = alt;
    if (content[cursor] === '[') {
      const end = content.indexOf(']', cursor + 1);
      if (end < 0) continue;
      reference = content.slice(cursor + 1, end) || alt;
      cursor = end + 1;
    }
    const definition = definitions.get(normalizeLabel(reference));
    if (definition) {
      matches.push({
        full: content.slice(index, cursor),
        alt,
        index,
        src: definition.src,
        prefix: content.slice(index, altEnd) + (definition.suffix.startsWith('>') ? '(<' : '('),
        suffix: definition.suffix,
      });
      index = cursor - 1;
    }
  }
  return matches;
};

export const replaceMarkdownImageSources = (
  content: string,
  images: Array<ImageMatch & { newSrc: string }>
) => {
  for (let index = images.length - 1; index >= 0; index--) {
    const image = images[index];
    content =
      content.slice(0, image.index) +
      image.prefix +
      image.newSrc +
      image.suffix +
      content.slice(image.index + image.full.length);
  }
  return content;
};

// Export only the actual drawing, never its hidden interactive view. When a
// lazy diagram has not rendered, preserve readable source instead of a blank.
export const createMermaidExportMarkup = (svg: string | undefined, code: string) =>
  svg
    ? `<div class="mermaid">${svg}</div>`
    : `<p>图表尚未渲染，以下保留完整源码：</p><pre class="mermaid-source"><code>${escapeHtml(code)}</code></pre>`;

export const replaceOutsideCodeBlocks = (
  content: string,
  regex: RegExp,
  replacer: (match: string, ...args: string[]) => string
): string => {
  const fences = getCodeRanges(content);

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
  replaceOutsideCodeBlocks(
    content,
    /<iframe\s+([^>]*?)(?:\s*\/)?>(?:\s*<\/iframe>)?/gi,
    (_match, attributes: string) => {
      const cleaned = attributes
        .replace(/\s+height=["'][^"']*["']/gi, '')
        .replace(/\s+style=["'][^"']*["']/gi, '')
        .trim();
      return `<iframe ${cleaned} height="450" style="width: 100%; min-height: 450px; border: 0;"></iframe>`;
    }
  );

export const restoreMermaidBlocks = (content: string): string =>
  replaceOutsideCodeBlocks(
    content,
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
.mermaid-source code { white-space: pre-wrap; overflow-wrap: anywhere; }

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
