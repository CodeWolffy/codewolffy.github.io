import * as React from 'react';
import { Download, FileText, FileCode, Printer, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

type ExportFormat = 'markdown' | 'html' | 'pdf';

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

    // 生成 frontmatter 字符串（与原始 MDX 格式一致）
    const generateFrontmatter = () => {
        const lines = ['---'];
        lines.push(`title: ${frontmatter.title}`);
        if (frontmatter.description) {
            // 处理多行描述
            if (frontmatter.description.includes('\n')) {
                lines.push(`description: |-`);
                frontmatter.description.split('\n').forEach(line => lines.push(`  ${line}`));
            } else {
                lines.push(`description: ${frontmatter.description}`);
            }
        }
        if (frontmatter.pubDate) lines.push(`pubDate: ${frontmatter.pubDate.toISOString().split('T')[0]}`);
        if (frontmatter.updatedDate) lines.push(`updatedDate: ${frontmatter.updatedDate.toISOString().split('T')[0]}`);
        if (frontmatter.coverImage) lines.push(`coverImage: ${frontmatter.coverImage}`);
        if (frontmatter.heroImage) lines.push(`heroImage: ${frontmatter.heroImage}`);
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

    // 为视频链接添加禁止自动播放参数
    const disableAutoplay = (url: string) => {
        try {
            // 处理 Bilibili 和 YouTube
            if (url.includes('bilibili.com') || url.includes('youtube.com')) {
                const separator = url.includes('?') ? '&' : '?';
                if (!url.includes('autoplay=0')) {
                    // 如果已经有 autoplay=1，则替换
                    if (url.includes('autoplay=1')) {
                        return url.replace('autoplay=1', 'autoplay=0');
                    }
                    return `${url}${separator}autoplay=0`;
                }
            }
            return url;
        } catch (e) {
            return url;
        }
    };

    // 导出为 Markdown
    const exportMarkdown = () => {
        // 构建可见的头部信息（类似于页面显示效果）
        const headerParts = [];

        // 1. 标题
        headerParts.push(`# ${title}`);

        // 2. 元数据（发布时间、分类、标签）
        const metaParts = [];
        if (frontmatter.pubDate) {
            metaParts.push(`发布于 ${new Date(frontmatter.pubDate).toLocaleDateString('zh-CN')}`);
        }
        if (frontmatter.category) {
            const catName = typeof frontmatter.category === 'object' ? frontmatter.category.id : frontmatter.category;
            metaParts.push(`分类: ${catName}`);
        }
        if (frontmatter.tags && frontmatter.tags.length > 0) {
            const tagNames = frontmatter.tags.map(t => typeof t === 'object' ? t.id : t).join(', ');
            metaParts.push(`标签: ${tagNames}`);
        }
        if (metaParts.length > 0) {
            headerParts.push(`> ${metaParts.join(' | ')}`);
        }



        // 4. 封面图
        const image = frontmatter.coverImage || frontmatter.heroImage;
        if (image) {
            // 确保图片链接是绝对路径
            let fullImageUrl = image;
            if (image && !image.startsWith('http')) {
                try {
                    fullImageUrl = new URL(image, window.location.href).href;
                } catch (e) {
                    console.warn('Failed to resolve cover image URL:', image);
                }
            }
            headerParts.push(`<img src="${fullImageUrl}" alt="${title}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px;" />`);
        }

        // 处理内容中的视频 iframe，使其在 Markdown 预览中也有正确的高度
        let processedContent = content;
        try {
            // 查找 iframe 标签并包裹在响应式容器中 (添加 inline styles)
            processedContent = processedContent.replace(
                /<iframe\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>(?:<\/iframe>)?/gi,
                (match, beforeSrc, src, afterSrc) => {
                    // 提取 title
                    const fullAttributes = beforeSrc + ' ' + afterSrc;
                    const titleMatch = fullAttributes.match(/title=["']([^"']+)["']/);
                    const title = titleMatch ? titleMatch[1] : '';

                    // 移除可能导致闭合问题的尾部斜杠
                    const cleanBefore = beforeSrc.replace(/\/$/, '');
                    const cleanAfter = afterSrc.replace(/\/$/, '');

                    // 处理协议相对路径，确保在本地预览时能加载
                    let finalSrc = src;
                    if (finalSrc.startsWith('//')) {
                        finalSrc = 'https:' + finalSrc;
                    }

                    // 禁止自动播放
                    finalSrc = disableAutoplay(finalSrc);

                    // 使用更简单的 iframe 结构，Typora 等编辑器支持更好
                    // 设置固定高度 450px，宽度 100%
                    return `
<iframe src="${finalSrc}" ${cleanBefore.trim()} ${cleanAfter.trim()} width="100%" height="450" frameborder="0" style="border:0;"></iframe>
${title ? `<div style="text-align: center; margin-bottom: 20px; color: #475569; font-size: 13px;">${title}</div>` : ''}
`;
                }
            );
        } catch (e) {
            console.error('Error processing markdown content:', e);
            processedContent = content; // Fallback
        }

        // 组合完整内容：Frontmatter + 可见头部 + 原始内容
        const visibleHeader = headerParts.join('\n\n');
        const fullContent = `${generateFrontmatter()}\n\n${visibleHeader}\n\n${processedContent}`;

        const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
        downloadBlob(blob, getFileName('md'));
    };

    // 导出为 HTML
    const exportHtml = () => {
        const proseElement = document.querySelector('.prose');
        if (!proseElement) {
            alert('无法获取文章内容');
            return;
        }

        // 克隆内容以进行处理，避免修改页面显示
        const clone = proseElement.cloneNode(true) as HTMLElement;

        // 1. 处理图片链接：将相对路径转换为绝对路径
        const images = clone.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http')) {
                try {
                    img.src = new URL(src, window.location.href).href;
                } catch (e) {
                    console.warn('Failed to resolve image URL:', src);
                }
            }
        });

        // 2. 处理超链接：将相对路径转换为绝对路径
        const links = clone.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                try {
                    link.href = new URL(href, window.location.href).href;
                } catch (e) {
                    console.warn('Failed to resolve link URL:', href);
                }
            }
        });

        // 3. 处理 iframe (视频)：确保可见性和路径正确
        const iframes = clone.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            // 处理 src
            let src = iframe.getAttribute('src');
            if (src) {
                if (src.startsWith('//')) {
                    src = 'https:' + src;
                }
                // 禁止自动播放
                src = disableAutoplay(src);
                iframe.src = src;
            }

            // 移除可能导致布局问题的 class 和 style
            iframe.removeAttribute('class');

            // 强制设置样式和尺寸，确保在无外部 CSS 时可见
            iframe.style.width = '100%';
            iframe.style.height = '450px';
            iframe.style.border = '0';
            iframe.style.display = 'block';
            iframe.style.marginBottom = '20px'; // 增加一点底部间距
            iframe.setAttribute('width', '100%');
            iframe.setAttribute('height', '450');
            iframe.setAttribute('frameborder', '0');

            // 如果父元素是专门的 wrapper (可能因为 CSS 缺失导致高度为 0)，尝试解除或修复
            // 这里简单处理：如果父节点是 div 且看起来像是一个 wrapper，
            // 我们可以尝试把父节点的样式重置，或者直接把 iframe 移出来（略复杂）。
            // 最简单的方式是将父节点的可能导致的 hidden/height:0 样式清空。
            if (iframe.parentElement && iframe.parentElement.tagName === 'DIV') {
                iframe.parentElement.style.height = 'auto';
                iframe.parentElement.style.paddingBottom = '0';
                iframe.parentElement.style.overflow = 'visible';
                iframe.parentElement.style.position = 'static';
            }
        });

        // 4. 移除不必要的 UI 元素（如复制按钮等，如果有的话）
        // 假设复制按钮有特定类名，这里举例移除 .copy-btn
        const trash = clone.querySelectorAll('.copy-btn, .hidden-print');
        trash.forEach(el => el.remove());

        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.75;
            color: #374151;
            background-color: #fff;
        }
        h1 { font-size: 2.25em; font-weight: 700; margin-bottom: 0.5em; color: #111827; }
        h2 { font-size: 1.5em; font-weight: 600; margin-top: 2em; margin-bottom: 1em; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.75em; color: #374151; }
        p { margin-bottom: 1.25em; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5em 0; }
        blockquote { border-left: 4px solid #e5e7eb; margin: 1.5em 0; padding-left: 1em; color: #6b7280; font-style: italic; }
        ul, ol { margin-bottom: 1.25em; padding-left: 1.5em; }
        li { margin-bottom: 0.5em; }
        hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2em 0; }
        
        /* 代码块样式 */
        pre { 
            background: #f3f4f6; 
            padding: 1em; 
            border-radius: 6px; 
            overflow-x: auto; 
            margin-bottom: 1.5em;
            font-size: 0.9em;
            border: 1px solid #e5e7eb;
        }
        code { 
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background: #f3f4f6; 
            padding: 0.2em 0.4em; 
            border-radius: 4px; 
            font-size: 0.9em;
            color: #ec4899;
        }
        pre code { 
            background: none; 
            padding: 0; 
            color: inherit;
            font-size: inherit;
        }

        /* 表格样式 */
        table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; }
        th, td { border: 1px solid #e5e7eb; padding: 0.75em; text-align: left; }
        th { background-color: #f9fafb; font-weight: 600; }

        /* 视频容器响应式样式 */
        .video-wrapper {
            position: relative;
            padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
            height: 0;
            overflow: hidden;
            margin-bottom: 1.5em;
            border-radius: 8px;
            background: #f1f5f9;
        }
        .video-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 0;
        }
        figure { margin: 1.5em 0; }
        figcaption { text-align: center; color: #6b7280; font-size: 0.875em; margin-top: 0.5em; }

        .meta { margin-bottom: 2em; color: #6b7280; font-size: 0.9em; border-bottom: 1px solid #e5e7eb; padding-bottom: 1em; }
        .meta span { margin-right: 1em; }
        .cover-image { width: 100%; max-height: 400px; object-fit: cover; margin-bottom: 2em; border-radius: 8px; }
        .description { font-size: 1.1em; color: #4b5563; margin-bottom: 1.5em; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    
    <div class="meta">
        ${frontmatter.pubDate ? `<span>发布于 ${new Date(frontmatter.pubDate).toLocaleDateString('zh-CN')}</span>` : ''}
        ${frontmatter.category ? `<span>分类: ${typeof frontmatter.category === 'object' ? frontmatter.category.id : frontmatter.category}</span>` : ''}
    </div>

    ${(() => {
                const image = frontmatter.coverImage || frontmatter.heroImage;
                if (image) {
                    let fullImageUrl = image;
                    if (!image.startsWith('http')) {
                        try {
                            fullImageUrl = new URL(image, window.location.href).href;
                        } catch (e) { /* ignore */ }
                    }
                    return `<img src="${fullImageUrl}" alt="${title}" class="cover-image">`;
                }
                return '';
            })()}

    <article>
        ${clone.innerHTML}
    </article>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, getFileName('html'));
    };

    // 导出为 PDF (调用浏览器打印)
    const exportPdf = () => {
        window.print();
    };



    // 下载 Blob 文件
    const downloadBlob = (blob: Blob, fileName: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 处理导出
    const handleExport = async (format: ExportFormat) => {
        setIsOpen(false);
        switch (format) {
            case 'markdown':
                exportMarkdown();
                break;
            case 'html':
                exportHtml();
                break;
            case 'pdf':
                exportPdf();
                break;
        }
    };

    const formatOptions = [
        { value: 'markdown' as ExportFormat, label: 'Markdown', icon: FileText, desc: '原始格式' },
        { value: 'html' as ExportFormat, label: 'HTML', icon: FileCode, desc: '网页格式' },
        { value: 'pdf' as ExportFormat, label: 'PDF', icon: Printer, desc: '打印/另存为PDF' },
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
                {isExporting ? '导出中...' : '导出文章'}
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-lg border border-border bg-background shadow-lg z-50">
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
