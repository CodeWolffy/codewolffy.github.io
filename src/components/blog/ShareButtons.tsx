import * as React from 'react';
import { Share2, Link2, Twitter, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareButtonsProps {
    title: string;
    url: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
    const [copied, setCopied] = React.useState(false);
    const [showQR, setShowQR] = React.useState(false);

    const encodedTitle = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(url);

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
        weibo: `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`,
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">分享：</span>

            {/* 微信分享 - 显示二维码提示 */}
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-green-500/10 hover:text-green-500"
                onClick={() => setShowQR(!showQR)}
                title="微信分享"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
                </svg>
            </Button>

            {/* 微博分享 */}
            <a href={shareLinks.weibo} target="_blank" rel="noopener noreferrer">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-red-500/10 hover:text-red-500"
                    title="分享到微博"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.573h.014zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.57-.18-.405-.615.375-.94.42-1.754.015-2.315-.76-1.035-2.834-1.005-5.182-.045 0 0-.72.315-.54-.255.36-1.12.315-2.054-.27-2.595-1.29-1.2-4.771.045-7.767 2.79C2.296 10.784.96 12.959.96 14.817c0 3.555 4.574 5.715 9.041 5.715 5.859 0 9.764-3.406 9.764-6.104 0-1.635-1.378-2.569-2.706-2.979zm.928-6.594c-.601-.63-1.471-.93-2.416-.87l-.176-.015c-.18-.015-.33.105-.36.27-.029.18.09.345.27.39l.21.03c.72.045 1.35.27 1.815.72.465.45.69 1.05.66 1.83l-.015.21c-.015.18.105.345.285.375.18.029.345-.105.375-.285l.015-.225c.045-.96-.21-1.8-.66-2.43h-.003zm2.37-.405c-1.17-1.29-2.895-1.95-4.77-1.875-.225.015-.39.18-.375.405.015.21.195.375.405.36 1.635-.06 3.09.48 4.05 1.545.93 1.05 1.365 2.49 1.17 3.99l-.015.21c-.015.21.135.39.33.42.21.015.39-.135.42-.33l.015-.24c.225-1.71-.24-3.375-1.23-4.494v.009z" />
                    </svg>
                </Button>
            </a>

            {/* Twitter 分享 */}
            <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-blue-500/10 hover:text-blue-500"
                    title="分享到 Twitter"
                >
                    <Twitter className="h-4 w-4" />
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                    <Link2 className="h-4 w-4" />
                )}
            </Button>

            {/* 微信二维码提示 */}
            {showQR && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-card border border-border rounded-lg shadow-lg z-50">
                    <p className="text-sm text-muted-foreground">请使用微信扫描页面二维码分享</p>
                </div>
            )}
        </div>
    );
}
