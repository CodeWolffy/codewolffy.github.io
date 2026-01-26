import * as React from 'react';
import { Download, FileText, FileCode, Printer, ChevronDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

interface ExportButtonProps {
    title: string;
    content: string;        // Markdown 原始内容
    frontmatter: {
        title: string;
        description?: string;
        pubDate?: Date;
        updatedDate?: Date;
        category?: { id: string };
        tags?: { id: string }[];
        coverImage?: string;
        heroImage?: string;
        [key: string]: unknown;
    };
}

type ExportFormat = 'markdown' | 'html' | 'pdf' | 'zip';

export function ExportButton({ title, content, frontmatter }: ExportButtonProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // 点击外部关闭下拉菜单
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 生成安全的文件名
    const getFileName = (ext: string) => {
        const safeName = title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 50);
        return `${safeName}.${ext}`;
    };

    // 辅助：获取图片 Blob
    const fetchImageBlob = async (url: string): Promise<Blob | null> => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
            return await response.blob();
        } catch (e) {
            console.warn('Image fetch failed:', url, e);
            return null;
        }
    };

    // 辅助：压缩图片 (Resize + JPEG)
    const compressImageBlob = async (blob: Blob): Promise<Blob> => {
        if (blob.type === 'image/svg+xml') return blob;

        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 1200; // 限制最大长宽

                if (width > maxDim || height > maxDim) {
                    const ratio = width / height;
                    if (width > height) {
                        width = maxDim;
                        height = width / ratio;
                    } else {
                        height = maxDim;
                        width = height * ratio;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // 填充白色背景
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // 转换为 JPEG 0.75
                    canvas.toBlob((b) => {
                        resolve(b || blob);
                    }, 'image/jpeg', 0.75);
                } else {
                    resolve(blob);
                }
                URL.revokeObjectURL(url);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(blob);
            };

            img.src = url;
        });
    };

    // 辅助：Blob 转 Base64
    const blobToBase64 = async (blob: Blob): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    };

    // 辅助：URL 转 Base64
    const urlToBase64 = async (url: string, shouldCompress: boolean = false): Promise<string> => {
        try {
            if (url.startsWith('data:')) return url;

            let blob = await fetchImageBlob(url);
            if (!blob) return url;

            if (shouldCompress) {
                try {
                    blob = await compressImageBlob(blob);
                } catch (err) {
                    console.warn('Compression failed, using original', err);
                }
            }

            return await blobToBase64(blob);
        } catch (e) {
            return url;
        }
    };

    // 辅助：解析完整的图片 URL
    const resolveImageUrl = (src: string) => {
        if (!src) return '';
        if (src.startsWith('http') || src.startsWith('data:')) return src;
        try {
            return new URL(src, window.location.href).href;
        } catch {
            return src;
        }
    };

    // 生成 frontmatter 字符串
    const generateFrontmatter = (customCoverImage?: string) => {
        const lines = ['---'];
        lines.push(`title: ${frontmatter.title}`);
        if (frontmatter.description) {
            if (frontmatter.description.includes('\n')) {
                lines.push(`description: |-`);
                frontmatter.description.split('\n').forEach(line => lines.push(`  ${line}`));
            } else {
                lines.push(`description: ${frontmatter.description}`);
            }
        }
        if (frontmatter.pubDate) lines.push(`pubDate: ${frontmatter.pubDate.toISOString().split('T')[0]}`);
        if (frontmatter.updatedDate) lines.push(`updatedDate: ${frontmatter.updatedDate.toISOString().split('T')[0]}`);

        if (customCoverImage) {
            lines.push(`coverImage: ${customCoverImage}`);
        } else {
            const originalCover = frontmatter.coverImage || frontmatter.heroImage;
            if (originalCover && !originalCover.trim().startsWith('data:')) {
                lines.push(`coverImage: ${originalCover}`);
            }
        }

        if (frontmatter.draft !== undefined) lines.push(`draft: ${frontmatter.draft}`);
        if (frontmatter.category) lines.push(`category: ${typeof frontmatter.category === 'object' ? frontmatter.category.id : frontmatter.category}`);
        if (frontmatter.tags?.length) {
            lines.push('tags:');
            frontmatter.tags.forEach(tag => {
                const tagId = typeof tag === 'object' ? tag.id : tag;
                lines.push(`  - ${tagId}`);
            });
        }
        lines.push('---');
        return lines.join('\n');
    };

    // 辅助：生成 Markdown 可见头部
    const generateMarkdownHeader = (coverImageSrc?: string, isBase64Mode: boolean = false) => {
        const parts = [];
        parts.push(`# ${title}`);

        const metaParts = [];
        if (frontmatter.pubDate) {
            metaParts.push(`发布于 ${new Date(frontmatter.pubDate).toLocaleDateString('zh-CN')}`);
        }
        if (frontmatter.category) {
            // @ts-ignore
            const catName = typeof frontmatter.category === 'object' ? frontmatter.category.id : frontmatter.category;
            metaParts.push(`分类: ${catName}`);
        }
        if (frontmatter.tags && frontmatter.tags.length > 0) {
            // @ts-ignore
            const tagNames = frontmatter.tags.map(t => typeof t === 'object' ? t.id : t).join(', ');
            metaParts.push(`标签: ${tagNames}`);
        }
        if (metaParts.length > 0) {
            parts.push(`> ${metaParts.join(' | ')}`);
        }

        if (coverImageSrc) {
            if (isBase64Mode) {
                // 回归内联，但在 Header 中我们也使用 ![]() 形式，如果需要样式可能得用 HTML
                // 为了兼容 Typora，标准语法最稳妥。Lag 已经被压缩解决。
                parts.push(`![封面图](${coverImageSrc})`);
            } else {
                parts.push(`<img src="${coverImageSrc}" alt="${title}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />`);
            }
        }

        return parts.join('\n\n');
    };

    // 导出 Markdown (单文件，内嵌 Base64)
    const exportMarkdown = async () => {
        const shouldCompress = true;
        const image = frontmatter.coverImage || frontmatter.heroImage;
        let base64Cover = '';
        if (image) {
            base64Cover = await urlToBase64(resolveImageUrl(image), shouldCompress);
        }

        let processedContent = content;
        const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
        const replacements = [];
        let match;

        while ((match = imageRegex.exec(content)) !== null) {
            replacements.push({
                full: match[0],
                alt: match[1],
                src: match[2]
            });
        }

        // 转换 Base64
        const processedImages = await Promise.all(replacements.map(async (item) => {
            const fullSrc = resolveImageUrl(item.src);
            const base64 = await urlToBase64(fullSrc, shouldCompress);
            return { ...item, newSrc: base64 };
        }));

        // 替换 (使用内联替换，放弃引用式链接以避免 Footer 也显示)
        processedImages.forEach(item => {
            if (processedContent.includes(item.full)) {
                // 使用 split/join 确保只替换内容中的 URL，保持内联结构
                processedContent = processedContent.split(item.full).join(`![${item.alt}](${item.newSrc})`);
            }
        });

        // 1. Frontmatter
        const frontmatterStr = generateFrontmatter();
        // 2. Header
        const headerStr = generateMarkdownHeader(base64Cover || undefined, true);

        // 3. 构建完整内容 (无 Footer References)
        const fullContent = `${frontmatterStr}\n\n${headerStr}\n\n${processedContent}`;

        const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
        FileSaver.saveAs(blob, getFileName('md'));
    };

    // 导出 HTML (单文件，内嵌 Base64)
    const exportHtml = async () => {
        const proseElement = document.querySelector('.prose');
        if (!proseElement) {
            alert('无法获取文章内容');
            return;
        }

        const clone = proseElement.cloneNode(true) as HTMLElement;

        const images = Array.from(clone.querySelectorAll('img'));
        await Promise.all(images.map(async (img) => {
            const src = img.getAttribute('src');
            if (src) {
                const fullSrc = resolveImageUrl(src);
                const base64 = await urlToBase64(fullSrc, true);
                img.src = base64;
                img.removeAttribute('srcset');
            }
        }));

        const links = clone.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                try {
                    link.href = new URL(href, window.location.href).href;
                } catch { /* ignore */ }
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
    <style>
        body { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: system-ui, sans-serif; line-height: 1.6; color: #374151; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5em 0; }
        pre { background: #f3f4f6; padding: 1em; border-radius: 6px; overflow-x: auto; }
        code { font-family: monospace; background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 4px; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #e5e7eb; padding-left: 1em; color: #6b7280; font-style: italic; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; }
        th, td { border: 1px solid #e5e7eb; padding: 0.75em; text-align: left; }
        a { color: #2563eb; text-decoration: none; }
        h1 { font-size: 2.25em; margin-bottom: 0.5em; color: #111827; }
        .meta { color: #6b7280; margin-bottom: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 1em; }
        .cover-img { width: 100%; max-height: 400px; object-fit: cover; margin-bottom: 2em; border-radius: 8px; }
    </style>
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
        FileSaver.saveAs(blob, getFileName('html'));
    };

    // 导出 ZIP 包 (Markdown + Assets)
    const exportZip = async () => {
        const zip = new JSZip();
        const assetsFolder = zip.folder('assets');

        let processedContent = content;

        const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
        const replacements = [];
        let match;
        while ((match = imageRegex.exec(content)) !== null) {
            replacements.push({ full: match[0], alt: match[1], src: match[2] });
        }

        await Promise.all(replacements.map(async (item, index) => {
            const fullSrc = resolveImageUrl(item.src);
            const blob = await fetchImageBlob(fullSrc);
            if (blob) {
                const ext = fullSrc.split('.').pop()?.split(/[?#]/)[0] || 'png';
                const fileName = `img-${index}-${Date.now()}.${ext}`;
                assetsFolder?.file(fileName, blob);
                processedContent = processedContent.split(item.src).join(`assets/${fileName}`);
            }
        }));

        let coverImageName = '';
        const coverImage = frontmatter.coverImage || frontmatter.heroImage;
        if (coverImage) {
            const fullSrc = resolveImageUrl(coverImage);
            const blob = await fetchImageBlob(fullSrc);
            if (blob) {
                const ext = fullSrc.split('.').pop()?.split(/[?#]/)[0] || 'png';
                coverImageName = `cover-${Date.now()}.${ext}`;
                assetsFolder?.file(coverImageName, blob);
            }
        }

        const frontmatterStr = coverImageName
            ? generateFrontmatter(`assets/${coverImageName}`)
            : generateFrontmatter();

        const headerStr = generateMarkdownHeader(coverImageName ? `assets/${coverImageName}` : undefined, false);

        const fullContent = `${frontmatterStr}\n\n${headerStr}\n\n${processedContent}`;
        zip.file('index.md', fullContent);

        const contentBlob = await zip.generateAsync({ type: 'blob' });
        FileSaver.saveAs(contentBlob, getFileName('zip'));
    };

    const handleExport = async (format: ExportFormat) => {
        setIsOpen(false);
        setIsExporting(true);
        try {
            switch (format) {
                case 'markdown': await exportMarkdown(); break;
                case 'zip': await exportZip(); break;
                case 'html': await exportHtml(); break;
                case 'pdf': window.print(); break;
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('导出过程中发生错误');
        } finally {
            setIsExporting(false);
        }
    };

    const formatOptions = [
        { value: 'markdown' as ExportFormat, label: 'Markdown', icon: FileText, desc: '内嵌图片 (单文件)' },
        { value: 'zip' as ExportFormat, label: 'Markdown 压缩包', icon: Package, desc: '分离素材 (完美版)' },
        { value: 'html' as ExportFormat, label: 'HTML', icon: FileCode, desc: '离线网页 (单文件)' },
        { value: 'pdf' as ExportFormat, label: 'PDF', icon: Printer, desc: '打印预览' },
    ];

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting}
            >
                <Download className="h-4 w-4" />
                {isExporting ? '处理中...' : '导出'}
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-border bg-background shadow-lg z-50">
                    {formatOptions.map((option) => (
                        <button
                            key={option.value}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg"
                            onClick={() => handleExport(option.value)}
                        >
                            <option.icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
