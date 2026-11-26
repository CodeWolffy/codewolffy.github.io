import { useMemo, useState, useSyncExternalStore } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
}

type CopyState = 'idle' | 'success' | 'error';

function getBrowserShareUrl(fallbackUrl: string) {
  try {
    const currentUrl = new URL(window.location.href || fallbackUrl, window.location.origin);
    currentUrl.hash = '';
    return currentUrl.toString();
  } catch {
    return fallbackUrl;
  }
}

function getShareText(title: string, description: string) {
  return [title, description.trim()].filter(Boolean).join('\n');
}

async function writeClipboardText(text: string) {
  if (!window.isSecureContext || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard API unavailable');
  }

  await navigator.clipboard.writeText(text);
}

export function ShareButtons({ title, url, description = '' }: ShareButtonsProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const shareUrl = useSyncExternalStore(
    (callback) => {
      window.addEventListener('popstate', callback);
      window.addEventListener('hashchange', callback);
      return () => {
        window.removeEventListener('popstate', callback);
        window.removeEventListener('hashchange', callback);
      };
    },
    () => getBrowserShareUrl(url),
    () => url
  );

  const shareLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(getShareText(title, description));

    return {
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      weibo: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedText}`,
    };
  }, [description, shareUrl, title]);

  const copyLink = async () => {
    try {
      await writeClipboardText(shareUrl);
      setCopyState('success');
    } catch (err) {
      console.error('复制失败:', err);
      setCopyState('error');
    } finally {
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const handleNativeShare = async () => {
    const trimmedDescription = description.trim();
    const shareData: ShareData = {
      title,
      url: shareUrl,
      ...(trimmedDescription ? { text: trimmedDescription } : {}),
    };

    if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) {
      await copyLink();
      return;
    }

    try {
      await navigator.share(shareData);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
        await copyLink();
      }
    }
  };

  const copyTitle =
    copyState === 'success' ? '已复制！' : copyState === 'error' ? '复制失败' : '复制链接';

  const externalShares = [
    {
      key: 'weibo',
      href: shareLinks.weibo,
      title: '分享到微博',
      className: 'hover:bg-red-500/10 hover:text-red-500',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.573h.014zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.57-.18-.405-.615.375-.94.42-1.754.015-2.315-.76-1.035-2.834-1.005-5.182-.045 0 0-.72.315-.54-.255.36-1.12.315-2.054-.27-2.595-1.29-1.2-4.771.045-7.767 2.79C2.296 10.784.96 12.959.96 14.817c0 3.555 4.574 5.715 9.041 5.715 5.859 0 9.764-3.406 9.764-6.104 0-1.635-1.378-2.569-2.706-2.979zm.928-6.594c-.601-.63-1.471-.93-2.416-.87l-.176-.015c-.18-.015-.33.105-.36.27-.029.18.09.345.27.39l.21.03c.72.045 1.35.27 1.815.72.465.45.69 1.05.66 1.83l-.015.21c-.015.18.105.345.285.375.18.029.345-.105.375-.285l.015-.225c.045-.96-.21-1.8-.66-2.43h-.003zm2.37-.405c-1.17-1.29-2.895-1.95-4.77-1.875-.225.015-.39.18-.375.405.015.21.195.375.405.36 1.635-.06 3.09.48 4.05 1.545.93 1.05 1.365 2.49 1.17 3.99l-.015.21c-.015.21.135.39.33.42.21.015.39-.135.42-.33l.015-.24c.225-1.71-.24-3.375-1.23-4.494v.009z" />
        </svg>
      ),
    },
    {
      key: 'x',
      href: shareLinks.x,
      title: '分享到 X',
      className: 'hover:bg-black/10 hover:text-black dark:hover:bg-white/10 dark:hover:text-white',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-sm text-muted-foreground mr-0.5">分享:</span>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-zinc-500/10 hover:text-zinc-500"
        onClick={handleNativeShare}
        title="系统分享，若不可用则复制链接"
        aria-label="系统分享"
      >
        <Share2 className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
        onClick={copyLink}
        title={copyTitle}
        aria-label={copyTitle}
      >
        {copyState === 'success' ? (
          <Check className="h-5 w-5 text-green-500" />
        ) : (
          <Link2 className={copyState === 'error' ? 'h-5 w-5 text-destructive' : 'h-5 w-5'} />
        )}
      </Button>

      {externalShares.map((share) => (
        <Button
          key={share.key}
          asChild
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full ${share.className}`}
          title={share.title}
          aria-label={share.title}
        >
          <a href={share.href} target="_blank" rel="noopener noreferrer">
            {share.icon}
          </a>
        </Button>
      ))}

      <span className="sr-only" aria-live="polite">
        {copyState === 'success' ? '链接已复制' : copyState === 'error' ? '复制失败' : ''}
      </span>
    </div>
  );
}
