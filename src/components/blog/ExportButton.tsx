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
import {
  EXPORT_HTML_STYLES,
  IMAGE_FETCH_CONCURRENCY,
  escapeHtml,
  fetchImageBlob,
  findMarkdownImages,
  fixIframesOutsideCodeBlocks,
  getFileName,
  mapWithConcurrency,
  resolveImageUrl,
  restoreMermaidBlocks,
  urlToBase64,
} from './export-utils';

interface ExportButtonProps {
  title: string;
  content: string;
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

  const exportMarkdown = async () => {
    const coverImage = frontmatter.coverImage || frontmatter.heroImage;
    let base64Cover = '';
    if (coverImage) {
      const coverUrl = resolveImageUrl(coverImage);
      base64Cover = coverUrl ? await urlToBase64(coverUrl, true) : '';
    }

    let processedContent = fixIframesOutsideCodeBlocks(restoreMermaidBlocks(content));
    const imageMatches = findMarkdownImages(processedContent);
    const processedImages = await mapWithConcurrency(
      imageMatches,
      IMAGE_FETCH_CONCURRENCY,
      async (item) => {
        const fullSrc = resolveImageUrl(item.src);
        const base64 = fullSrc ? await urlToBase64(fullSrc, true) : item.src;
        return { ...item, newSrc: base64 };
      }
    );

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

  const exportHtml = async () => {
    const proseElement = document.querySelector('.prose');
    if (!proseElement) {
      showToast('无法获取文章内容');
      return;
    }

    const clone = proseElement.cloneNode(true) as HTMLElement;
    const images = Array.from(clone.querySelectorAll('img'));

    await mapWithConcurrency(images, IMAGE_FETCH_CONCURRENCY, async (img) => {
      const src = img.getAttribute('src');
      if (!src) return;

      const fullSrc = resolveImageUrl(src);
      if (!fullSrc) return;

      const base64 = await urlToBase64(fullSrc, true);
      img.src = base64;
      img.removeAttribute('srcset');
    });

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

    clone.querySelectorAll('.mermaid-modal').forEach((el) => el.remove());
    clone.querySelectorAll('.mermaid-container').forEach((container) => {
      container
        .querySelectorAll('.mermaid-toolbar, .mermaid-code-view')
        .forEach((el) => el.remove());
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
      const coverUrl = resolveImageUrl(coverImage);
      coverImageBase64 = coverUrl ? await urlToBase64(coverUrl, true) : '';
    }
    const escapedTitle = escapeHtml(title);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapedTitle}</title>
    <style>${EXPORT_HTML_STYLES}</style>
</head>
<body>
    <h1>${escapedTitle}</h1>
    <div class="meta">
        ${frontmatter.pubDate ? `<span>发布于 ${new Date(frontmatter.pubDate).toLocaleDateString('zh-CN')}</span>` : ''}
    </div>
    ${coverImageBase64 ? `<img src="${coverImageBase64}" class="cover-img" alt="${escapedTitle}" />` : ''}
    <article>
        ${clone.innerHTML}
    </article>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    FileSaver.saveAs(blob, getFileName(title, 'html'));
  };

  const exportZip = async () => {
    const zip = new JSZip();
    const assetsFolder = zip.folder('assets');

    let processedContent = fixIframesOutsideCodeBlocks(restoreMermaidBlocks(content));
    const imageMatches = findMarkdownImages(processedContent);
    const timestamp = Date.now();

    const zipImages = await mapWithConcurrency(
      imageMatches,
      IMAGE_FETCH_CONCURRENCY,
      async (item, index) => {
        const fullSrc = resolveImageUrl(item.src);
        if (!fullSrc) return undefined;

        const blob = await fetchImageBlob(fullSrc);
        if (!blob) return undefined;

        const ext = fullSrc.split('.').pop()?.split(/[?#]/)[0] || 'png';
        const fileName = `img-${index}-${timestamp}.${ext}`;
        assetsFolder?.file(fileName, blob);
        return { ...item, newSrc: `assets/${fileName}` };
      }
    );

    for (let i = zipImages.length - 1; i >= 0; i--) {
      const item = zipImages[i];
      if (!item) continue;

      processedContent =
        processedContent.slice(0, item.index) +
        `![${item.alt}](${item.newSrc})` +
        processedContent.slice(item.index + item.full.length);
    }

    let coverImageName = '';
    const coverImage = frontmatter.coverImage || frontmatter.heroImage;
    if (coverImage) {
      const fullSrc = resolveImageUrl(coverImage);
      const blob = fullSrc ? await fetchImageBlob(fullSrc) : null;
      if (blob && fullSrc) {
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
