import { useState, useRef, useEffect, useCallback } from 'react';
import { stringify as stringifyYaml } from 'yaml';
import {
  Download,
  FileText,
  FileCode,
  Printer,
  ChevronDown,
  Package,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileSaver from 'file-saver';
import JSZip from 'jszip';

interface ExportButtonProps {
  title: string;
  content: string; // Markdown 原始内容
  frontmatter: {
    title: string;
    description?: string;
    pubDate?: Date;
    updatedDate?: Date;
    category?: string;
    tags?: string[];
    coverImage?: string;
    heroImage?: string;
    draft?: boolean;
    [key: string]: unknown;
  };
  className?: string;
}

type ExportFormat = 'markdown' | 'html' | 'pdf' | 'zip';
type ToastType = 'error' | 'success';

const FETCH_TIMEOUT_MS = 15000;
const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 0.75;
const MAX_FILENAME_LENGTH = 50;

// ============================================================
// 通用工具函数
// ============================================================

const getFileName = (title: string, ext: string) => {
  const safeName = title.replace(/[<>:"/\\|?*]/g, '_').trim() || 'untitled';
  return `${safeName.slice(0, MAX_FILENAME_LENGTH)}.${ext}`;
};

const fetchWithTimeout = async (url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const isSafeImageUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith('data:')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // 相对地址在 resolveImageUrl 后再校验
    return true;
  }
};

const resolveImageUrl = (src: string): string => {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
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

      // 填充白色背景，避免透明 PNG 在浅色主题下出现黑底
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          resolve(b ?? blob);
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

const fetchImageBlob = async (url: string): Promise<Blob | null> => {
  if (!isSafeImageUrl(url)) {
    console.warn('Unsafe image URL skipped:', url);
    return null;
  }
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } catch (e) {
    console.warn('Image fetch failed:', url, e);
    return null;
  }
};

const urlToBase64 = async (url: string, shouldCompress = false): Promise<string> => {
  try {
    if (url.startsWith('data:')) return url;
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

// ============================================================
// Markdown 处理辅助函数
// ============================================================

interface ImageMatch {
  full: string;
  alt: string;
  src: string;
  index: number;
}

const findMarkdownImages = (content: string): ImageMatch[] => {
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

/**
 * 仅替换代码块之外的匹配内容，避免破坏示例代码。
 */
const replaceOutsideCodeBlocks = (
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

  let result = '';
  let lastIndex = 0;
  let contentMatch: RegExpExecArray | null;
  regex.lastIndex = 0;
  while ((contentMatch = regex.exec(content)) !== null) {
    const matchStart = contentMatch.index;
    const matchEnd = matchStart + contentMatch[0].length;
    const insideFence = fences.some((f) => matchStart >= f.start && matchEnd <= f.end);
    if (insideFence) continue;
    result += content.slice(lastIndex, matchStart);
    result += replacer(contentMatch[0], ...contentMatch.slice(1));
    lastIndex = matchEnd;
  }
  result += content.slice(lastIndex);
  return result;
};

const fixIframesOutsideCodeBlocks = (content: string): string =>
  replaceOutsideCodeBlocks(
    content,
    /<iframe\s+([^>]*)>/g,
    (_match, attributes: string) => {
      const cleaned = attributes
        .replace(/\s+height=["'][^"']*["']/g, '')
        .replace(/\s+style=["'][^"']*["']/g, '');
      return `<iframe${cleaned} height="450" style="width: 100%; min-height: 450px; border: 0;">`;
    }
  );

const restoreMermaidBlocks = (content: string): string =>
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

// ============================================================
// HTML 导出样式（抽离为常量，方便维护）
// ============================================================

const EXPORT_HTML_STYLES = `
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

// ============================================================
// 组件
// ============================================================

export function ExportButton({ title, content, frontmatter, className }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 点击外部 + ESC 关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const generateFrontmatter = (customCoverImage?: string) => {
    const originalCover = frontmatter.coverImage || frontmatter.heroImage;
    const exportFrontmatter: Record<string, unknown> = {
      title: frontmatter.title,
    };

    if (frontmatter.description) exportFrontmatter.description = frontmatter.description;
    if (frontmatter.pubDate)
      exportFrontmatter.pubDate = frontmatter.pubDate.toISOString().split('T')[0];
    if (frontmatter.updatedDate)
      exportFrontmatter.updatedDate = frontmatter.updatedDate.toISOString().split('T')[0];
    if (customCoverImage) exportFrontmatter.coverImage = customCoverImage;
    else if (originalCover && !originalCover.trim().startsWith('data:'))
      exportFrontmatter.coverImage = originalCover;
    if (frontmatter.draft !== undefined) exportFrontmatter.draft = frontmatter.draft;
    if (frontmatter.category) exportFrontmatter.category = frontmatter.category;
    if (frontmatter.tags?.length) exportFrontmatter.tags = frontmatter.tags;

    return `---\n${stringifyYaml(exportFrontmatter, { lineWidth: 0 }).trimEnd()}\n---`;
  };

  const generateMarkdownHeader = (coverImageSrc?: string, isBase64Mode = false) => {
    const parts = [`# ${title}`];

    const metaParts: string[] = [];
    if (frontmatter.pubDate) {
      metaParts.push(`发布于 ${new Date(frontmatter.pubDate).toLocaleDateString('zh-CN')}`);
    }
    if (frontmatter.category) metaParts.push(`分类: ${frontmatter.category}`);
    if (frontmatter.tags?.length) metaParts.push(`标签: ${frontmatter.tags.join(', ')}`);
    if (metaParts.length > 0) parts.push(`> ${metaParts.join(' | ')}`);

    if (coverImageSrc) {
      if (isBase64Mode) {
        parts.push(`![封面图](${coverImageSrc})`);
      } else {
        parts.push(
          `<img src="${coverImageSrc}" alt="${title}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />`
        );
      }
    }

    return parts.join('\n\n');
  };

  // 导出 Markdown (单文件，内嵌 Base64)
  const exportMarkdown = async () => {
    const coverImage = frontmatter.coverImage || frontmatter.heroImage;
    let base64Cover = '';
    if (coverImage) {
      base64Cover = await urlToBase64(resolveImageUrl(coverImage), true);
    }

    let processedContent = restoreMermaidBlocks(content);
    processedContent = fixIframesOutsideCodeBlocks(processedContent);

    const imageMatches = findMarkdownImages(processedContent);
    const processedImages = await Promise.all(
      imageMatches.map(async (item) => {
        const fullSrc = resolveImageUrl(item.src);
        const base64 = await urlToBase64(fullSrc, true);
        return { ...item, newSrc: base64 };
      })
    );

    // 从后往前替换，避免索引偏移导致误替换
    for (let i = processedImages.length - 1; i >= 0; i--) {
      const item = processedImages[i];
      processedContent =
        processedContent.slice(0, item.index) +
        `![${item.alt}](${item.newSrc})` +
        processedContent.slice(item.index + item.full.length);
    }

    const frontmatterStr = generateFrontmatter();
    const headerStr = generateMarkdownHeader(base64Cover || undefined, true);
    const fullContent = `${frontmatterStr}\n\n${headerStr}\n\n${processedContent}`;

    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    FileSaver.saveAs(blob, getFileName(title, 'md'));
  };

  // 导出 HTML (单文件，内嵌 Base64)
  const exportHtml = async () => {
    const proseElement = document.querySelector('.prose');
    if (!proseElement) {
      showToast('无法获取文章内容');
      return;
    }

    const clone = proseElement.cloneNode(true) as HTMLElement;

    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      images.map(async (img) => {
        const src = img.getAttribute('src');
        if (src) {
          const fullSrc = resolveImageUrl(src);
          const base64 = await urlToBase64(fullSrc, true);
          img.src = base64;
          img.removeAttribute('srcset');
        }
      })
    );

    const links = clone.querySelectorAll('a');
    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        try {
          link.href = new URL(href, window.location.href).href;
        } catch {
          /* ignore */
        }
      }
    });

    // 清理 Mermaid 交互元素
    clone.querySelectorAll('.mermaid-modal').forEach((el) => el.remove());
    clone.querySelectorAll('.mermaid-container').forEach((container) => {
      container.querySelectorAll('.mermaid-toolbar, .mermaid-code-view').forEach((el) => el.remove());
      container.removeAttribute('style');
      if (container instanceof HTMLElement) {
        container.style.height = 'auto';
        container.style.minHeight = '0';
      }
      const mermaidContent = container.querySelector('.mermaid-content');
      if (mermaidContent instanceof HTMLElement) {
        mermaidContent.removeAttribute('style');
        mermaidContent.style.transform = 'none';
      }
    });

    const coverImage = frontmatter.coverImage || frontmatter.heroImage;
    let coverImageBase64 = '';
    if (coverImage) {
      coverImageBase64 = await urlToBase64(resolveImageUrl(coverImage), true);
    }

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${EXPORT_HTML_STYLES}</style>
</head>
<body>
    <h1>${title}</h1>
    <div class="meta">
        ${frontmatter.pubDate ? `<span>发布于 ${new Date(frontmatter.pubDate).toLocaleDateString('zh-CN')}</span>` : ''}
    </div>
    ${coverImageBase64 ? `<img src="${coverImageBase64}" class="cover-img" alt="${title}" />` : ''}
    <article>
        ${clone.innerHTML}
    </article>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    FileSaver.saveAs(blob, getFileName(title, 'html'));
  };

  // 导出 ZIP 包 (Markdown + Assets)
  const exportZip = async () => {
    const zip = new JSZip();
    const assetsFolder = zip.folder('assets');

    let processedContent = restoreMermaidBlocks(content);
    processedContent = fixIframesOutsideCodeBlocks(processedContent);

    const imageMatches = findMarkdownImages(processedContent);
    const timestamp = Date.now();

    await Promise.all(
      imageMatches.map(async (item, index) => {
        const fullSrc = resolveImageUrl(item.src);
        const blob = await fetchImageBlob(fullSrc);
        if (!blob) return;

        const ext = fullSrc.split('.').pop()?.split(/[?#]/)[0] || 'png';
        const fileName = `img-${index}-${timestamp}.${ext}`;
        assetsFolder?.file(fileName, blob);

        // 仅替换该图片所在位置，避免误伤代码块中的相同字符串
        const prefix = processedContent.slice(0, item.index);
        const suffix = processedContent.slice(item.index + item.full.length);
        processedContent = `${prefix}![${item.alt}](assets/${fileName})${suffix}`;
      })
    );

    let coverImageName = '';
    const coverImage = frontmatter.coverImage || frontmatter.heroImage;
    if (coverImage) {
      const fullSrc = resolveImageUrl(coverImage);
      const blob = await fetchImageBlob(fullSrc);
      if (blob) {
        const ext = fullSrc.split('.').pop()?.split(/[?#]/)[0] || 'png';
        coverImageName = `cover-${timestamp}.${ext}`;
        assetsFolder?.file(coverImageName, blob);
      }
    }

    const frontmatterStr = coverImageName
      ? generateFrontmatter(`assets/${coverImageName}`)
      : generateFrontmatter();

    const headerStr = generateMarkdownHeader(
      coverImageName ? `assets/${coverImageName}` : undefined,
      false
    );

    const fullContent = `${frontmatterStr}\n\n${headerStr}\n\n${processedContent}`;
    zip.file('index.md', fullContent);

    const contentBlob = await zip.generateAsync({ type: 'blob' });
    FileSaver.saveAs(contentBlob, getFileName(title, 'zip'));
  };

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;
    setIsOpen(false);
    setIsExporting(true);
    try {
      switch (format) {
        case 'markdown':
          await exportMarkdown();
          showToast('Markdown 导出成功', 'success');
          break;
        case 'zip':
          await exportZip();
          showToast('压缩包导出成功', 'success');
          break;
        case 'html':
          await exportHtml();
          showToast('HTML 导出成功', 'success');
          break;
        case 'pdf':
          window.print();
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      showToast(error instanceof Error ? error.message : '导出过程中发生错误');
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      value: 'markdown' as ExportFormat,
      label: 'Markdown',
      icon: FileText,
      desc: '内嵌图片 (单文件)',
    },
    {
      value: 'zip' as ExportFormat,
      label: 'Markdown 压缩包',
      icon: Package,
      desc: '分离素材 (完美版)',
    },
    { value: 'html' as ExportFormat, label: 'HTML', icon: FileCode, desc: '离线网页 (单文件)' },
    { value: 'pdf' as ExportFormat, label: 'PDF', icon: Printer, desc: '打印预览' },
  ];

  return (
    <div className={`relative inline-block ${className || ''}`} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 w-full justify-center"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
      >
        <Download className="h-4 w-4" />
        {isExporting ? '处理中...' : '导出'}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 sm:w-56 rounded-lg border border-border bg-background shadow-lg z-50">
          {formatOptions.map((option) => (
            <button
              key={option.value}
              className="flex w-full items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg"
              onClick={() => handleExport(option.value)}
              disabled={isExporting}
            >
              <option.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium truncate">{option.label}</div>
                <div className="text-xs text-muted-foreground truncate">{option.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-lg px-4 py-2.5 shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
          role="status"
        >
          {toast.type === 'error' ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
