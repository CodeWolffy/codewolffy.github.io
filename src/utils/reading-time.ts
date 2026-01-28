/**
 * 精细化的阅读时间计算工具
 * 
 * 考虑因素：
 * - 中文文字：300 字/分钟
 * - 英文单词：200 单词/分钟
 * - 图片：每张图片 30 秒（查看与理解时间）
 * - 代码块：代码阅读速度较慢，按 50 行/分钟计算
 * - Mermaid 图表：每个图表 30 秒（理解流程图时间）
 * - 视频/Iframe：每个视频 2 分钟
 * - Callout：按普通文字计算
 */

export interface ReadingTimeResult {
    /** 阅读时间（分钟） */
    minutes: number;
    /** 纯文字字数 */
    wordCount: number;
    /** 图片数量 */
    imageCount: number;
    /** 代码行数 */
    codeLines: number;
    /** Mermaid 图表数量 */
    mermaidCount: number;
    /** 视频数量 */
    videoCount: number;
    /** 详细文本：如 "约 5 分钟" */
    text: string;
}

// 阅读速度配置（每分钟）
const WORDS_PER_MINUTE_CN = 300; // 中文字数
const WORDS_PER_MINUTE_EN = 200; // 英文单词
const CODE_LINES_PER_MINUTE = 50; // 代码行数
const IMAGE_SECONDS = 30; // 每张图片所需秒数
const MERMAID_SECONDS = 30; // 每个 Mermaid 图表所需秒数
const VIDEO_SECONDS = 120; // 每个视频/Iframe 所需秒数（2分钟）

/**
 * 计算内容的阅读时间
 * @param content MDX/Markdown 文章内容
 * @returns 阅读时间结果
 */
export function calculateReadingTime(content: string): ReadingTimeResult {
    if (!content || content.trim().length === 0) {
        return {
            minutes: 1,
            wordCount: 0,
            imageCount: 0,
            codeLines: 0,
            mermaidCount: 0,
            videoCount: 0,
            text: '约 1 分钟'
        };
    }

    let totalSeconds = 0;
    let processedContent = content;

    // 1. 统计并移除 Mermaid 图表
    const mermaidRegex = /```mermaid[\s\S]*?```/gi;
    const mermaidMatches = processedContent.match(mermaidRegex) || [];
    const mermaidCount = mermaidMatches.length;
    processedContent = processedContent.replace(mermaidRegex, '');

    // 还要匹配 MDX 组件形式的 Mermaid
    const mermaidComponentRegex = /<Mermaid[^>]*(?:>[\s\S]*?<\/Mermaid>|\/>)/gi;
    const mermaidComponentMatches = processedContent.match(mermaidComponentRegex) || [];
    const totalMermaidCount = mermaidCount + mermaidComponentMatches.length;
    processedContent = processedContent.replace(mermaidComponentRegex, '');

    // 2. 统计并移除代码块（获取代码行数）
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = processedContent.match(codeBlockRegex) || [];
    let codeLines = 0;
    codeBlocks.forEach(block => {
        // 移除语言标识行和结束标记
        const lines = block.split('\n').filter(line =>
            line.trim() !== '' &&
            !line.startsWith('```')
        );
        codeLines += lines.length;
    });
    processedContent = processedContent.replace(codeBlockRegex, '');

    // 3. 统计图片数量
    // Markdown 图片语法: ![alt](url) 或 ![alt][ref]
    const mdImageRegex = /!\[([^\]]*)\]\([^)]+\)/g;
    const mdImages = processedContent.match(mdImageRegex) || [];

    // HTML img 标签
    const htmlImageRegex = /<img[^>]+>/gi;
    const htmlImages = processedContent.match(htmlImageRegex) || [];

    const imageCount = mdImages.length + htmlImages.length;

    // 移除图片标记
    processedContent = processedContent.replace(mdImageRegex, '');
    processedContent = processedContent.replace(htmlImageRegex, '');

    // 4. 统计并移除视频/Iframe（计入阅读时间）
    const iframeMdxRegex = /<Iframe[^>]*(?:>[\s\S]*?<\/Iframe>|\/>)/gi;
    const iframeMdxMatches = processedContent.match(iframeMdxRegex) || [];
    processedContent = processedContent.replace(iframeMdxRegex, '');

    const iframeHtmlRegex = /<iframe[^>]*(?:>[\s\S]*?<\/iframe>|\/>)/gi;
    const iframeHtmlMatches = processedContent.match(iframeHtmlRegex) || [];
    processedContent = processedContent.replace(iframeHtmlRegex, '');

    const videoCount = iframeMdxMatches.length + iframeHtmlMatches.length;

    // 5. 移除其他 HTML 标签和 MDX 组件
    // Callout 组件
    processedContent = processedContent.replace(/<Callout[^>]*>[\s\S]*?<\/Callout>/gi, (match) => {
        // 保留 Callout 内的文字内容
        return match.replace(/<[^>]+>/g, ' ');
    });

    // 移除所有其他 HTML 标签
    processedContent = processedContent.replace(/<[^>]+>/g, ' ');

    // 5. 移除 Markdown 语法标记
    // 链接
    processedContent = processedContent.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Frontmatter
    processedContent = processedContent.replace(/^---[\s\S]*?---/m, '');
    // 标题标记
    processedContent = processedContent.replace(/^#+\s*/gm, '');
    // 加粗和斜体
    processedContent = processedContent.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
    processedContent = processedContent.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
    // 行内代码
    processedContent = processedContent.replace(/`([^`]+)`/g, '$1');
    // 列表标记
    processedContent = processedContent.replace(/^[\s]*[-*+]\s*/gm, '');
    processedContent = processedContent.replace(/^[\s]*\d+\.\s*/gm, '');
    // 引用
    processedContent = processedContent.replace(/^>\s*/gm, '');
    // 水平线
    processedContent = processedContent.replace(/^[-*_]{3,}$/gm, '');

    // 6. 统计中英文混合内容
    // 提取英文单词
    const englishWords = processedContent.match(/[a-zA-Z]+/g) || [];
    const englishWordCount = englishWords.length;

    // 移除英文，统计中文字符
    const chineseOnly = processedContent.replace(/[a-zA-Z0-9\s\p{P}]/gu, '');
    const chineseCharCount = chineseOnly.length;

    // 计算总字数（用于显示）
    const wordCount = chineseCharCount + englishWordCount;

    // 7. 计算总时间
    // 中文文字时间
    const chineseSeconds = (chineseCharCount / WORDS_PER_MINUTE_CN) * 60;

    // 英文单词时间
    const englishSeconds = (englishWordCount / WORDS_PER_MINUTE_EN) * 60;

    // 代码阅读时间
    const codeSeconds = (codeLines / CODE_LINES_PER_MINUTE) * 60;

    // 图片查看时间
    const imageSeconds = imageCount * IMAGE_SECONDS;

    // Mermaid 图表理解时间
    const mermaidSeconds = totalMermaidCount * MERMAID_SECONDS;

    // 视频观看时间
    const videoSeconds = videoCount * VIDEO_SECONDS;

    // 总秒数
    totalSeconds = chineseSeconds + englishSeconds + codeSeconds + imageSeconds + mermaidSeconds + videoSeconds;

    // 转换为分钟，最少 1 分钟
    const minutes = Math.max(1, Math.ceil(totalSeconds / 60));

    return {
        minutes,
        wordCount,
        imageCount,
        codeLines,
        mermaidCount: totalMermaidCount,
        videoCount,
        text: `约 ${minutes} 分钟`
    };
}

/**
 * 简化版：只返回分钟数
 */
export function getReadingTimeMinutes(content: string): number {
    return calculateReadingTime(content).minutes;
}
