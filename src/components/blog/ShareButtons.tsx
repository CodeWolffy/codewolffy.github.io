import * as React from 'react';
import { Link2, Mail, Facebook, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareButtonsProps {
    title: string;
    url: string;
    description?: string;
}

export function ShareButtons({ title, url, description = '' }: ShareButtonsProps) {
    const [copied, setCopied] = React.useState(false);
    const [shareUrl, setShareUrl] = React.useState(url);

    React.useEffect(() => {
        setShareUrl(window.location.href);
    }, []);

    const encodedTitle = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedDesc = encodeURIComponent(description || '');
    // 使用单换行符 (\n) 分隔标题和描述
    const combinedText = encodeURIComponent(`${title}\n${description || ''}`);

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${combinedText}&url=${encodedUrl}`,
        weibo: `https://service.weibo.com/share/share.php?title=${combinedText}&url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDesc}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${combinedText}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    // 原生分享: 标题换行描述，描述后双换行接链接
                    text: `${title}\n${description || ''}\n\n`,
                    url: shareUrl,
                });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        } else {
            alert('您的浏览器不支持系统分享');
        }
    };


    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    return (
        <div className="flex items-center gap-0.5 flex-wrap">
            <span className="text-sm text-muted-foreground">分享:</span>

            {/* 系统原生分享 (移动端体验最佳) */}
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-zinc-500/10 hover:text-zinc-500"
                onClick={handleNativeShare}
                title="系统分享"
            >
                <Share2 className="h-6 w-6" />
            </Button>


            {/* 微博分享 */}
            <a href={shareLinks.weibo} target="_blank" rel="noopener noreferrer">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-red-500/10 hover:text-red-500"
                    title="分享到微博"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.573h.014zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.57-.18-.405-.615.375-.94.42-1.754.015-2.315-.76-1.035-2.834-1.005-5.182-.045 0 0-.72.315-.54-.255.36-1.12.315-2.054-.27-2.595-1.29-1.2-4.771.045-7.767 2.79C2.296 10.784.96 12.959.96 14.817c0 3.555 4.574 5.715 9.041 5.715 5.859 0 9.764-3.406 9.764-6.104 0-1.635-1.378-2.569-2.706-2.979zm.928-6.594c-.601-.63-1.471-.93-2.416-.87l-.176-.015c-.18-.015-.33.105-.36.27-.029.18.09.345.27.39l.21.03c.72.045 1.35.27 1.815.72.465.45.69 1.05.66 1.83l-.015.21c-.015.18.105.345.285.375.18.029.345-.105.375-.285l.015-.225c.045-.96-.21-1.8-.66-2.43h-.003zm2.37-.405c-1.17-1.29-2.895-1.95-4.77-1.875-.225.015-.39.18-.375.405.015.21.195.375.405.36 1.635-.06 3.09.48 4.05 1.545.93 1.05 1.365 2.49 1.17 3.99l-.015.21c-.015.21.135.39.33.42.21.015.39-.135.42-.33l.015-.24c.225-1.71-.24-3.375-1.23-4.494v.009z" />
                    </svg>
                </Button>
            </a>

            {/* Twitter/X 分享 */}
            <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-black/10 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
                    title="分享到 X"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                    </svg>
                </Button>
            </a>

            {/* Facebook 分享 */}
            <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-blue-700/10 hover:text-blue-700"
                    title="分享到 Facebook"
                >
                    <Facebook className="h-6 w-6" />
                </Button>
            </a>

            {/* Telegram 分享 */}
            <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-cyan-500/10 hover:text-cyan-500"
                    title="分享到 Telegram"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                </Button>
            </a>

            {/* 邮件分享 */}
            <a href={shareLinks.email}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-orange-500/10 hover:text-orange-500"
                    title="通过邮件分享"
                >
                    <Mail className="h-6 w-6" />
                </Button>
            </a>

            {/* 复制链接 */}
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
                onClick={copyLink}
                title={copied ? '已复制！' : '复制链接'}
            >
                {copied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                    <Link2 className="h-6 w-6" />
                )}
            </Button>
        </div>
    );
}
