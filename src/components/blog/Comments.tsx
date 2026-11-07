import { useState, useEffect, useRef } from 'react';
import Giscus from '@giscus/react';
import { useTheme } from '@/hooks/useTheme';
import { observeCommentLoading } from './comment-loading';

interface GiscusConfig {
  enabled: boolean;
  id: string;
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: string;
  reactionsEnabled: string;
  emitMetadata: string;
  inputPosition: string;
  lang: string;
  loading: string;
}

interface CommentsProps {
  giscus: GiscusConfig;
}

export function Comments({ giscus }: CommentsProps) {
  const theme = useTheme();
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelLoadingRef = useRef<(() => void) | null>(null);

  // 处理 GitHub 登录后保持在评论区位置
  // 原理：当用户在评论区可见时离开页面（去 GitHub 登录），保存位置标记
  // 返回后检测标记并恢复位置
  useEffect(() => {
    let isCommentsVisible = false;
    let restoreTimer: number | undefined;
    let restoreFrame: number | undefined;
    const STORAGE_KEY = `giscus-scroll-position:${window.location.pathname}`;

    // 监听评论区是否在视口中
    const commentsDiv = containerRef.current;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isCommentsVisible = entries[0]?.isIntersecting || false;
      },
      { threshold: 0.1 }
    );

    if (commentsDiv) {
      intersectionObserver.observe(commentsDiv);
    }

    // 页面加载时检查是否需要恢复位置
    let savedPosition: string | null = null;
    try {
      savedPosition = window.sessionStorage.getItem(STORAGE_KEY);
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable in private browsing or when blocked by the user.
    }
    const parsedPosition = savedPosition === null ? Number.NaN : Number(savedPosition);
    if (Number.isFinite(parsedPosition) && parsedPosition >= 0) {
      // 等待页面布局稳定后滚动，避免移动端渲染冲突。
      restoreTimer = window.setTimeout(() => {
        restoreFrame = window.requestAnimationFrame(() => {
          window.scrollTo({
            top: parsedPosition,
            behavior: 'instant',
          });
        });
      }, 300);
    }

    // 页面隐藏时（用户跳转到 GitHub 登录），保存滚动位置
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isCommentsVisible) {
        try {
          window.sessionStorage.setItem(STORAGE_KEY, String(window.scrollY));
        } catch {
          // Position restoration is optional when storage is unavailable.
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearTimeout(restoreTimer);
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
    };
  }, []);

  // "Smart Eager" Loading:
  // Wait for the main thread to settle (useEffect runs after paint), then trigger "eager" loading.
  // This prevents the heavy iframe setup from blocking the initial page scroll/interaction.
  const [shouldLoad, setShouldLoad] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
      setLoadState('loading');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldLoad || !giscus.enabled) return;

    const container = containerRef.current;
    if (!container) return;
    const cancel = observeCommentLoading(container, setLoadState);
    cancelLoadingRef.current = cancel;

    return () => {
      cancel();
      if (cancelLoadingRef.current === cancel) cancelLoadingRef.current = null;
    };
  }, [shouldLoad, giscus.enabled, retryCount]);

  const retry = () => {
    cancelLoadingRef.current?.();
    setLoadState('loading');
    setRetryCount((count) => count + 1);
  };

  return (
    <div
      id="comments-container"
      ref={containerRef}
      className="w-full mt-2 scroll-mt-20 min-h-[300px]"
      style={{ contain: 'content' }} // CSS Isolation: isolates layout calculations
    >
      {!giscus.enabled && (
        <p className="py-8 text-center text-sm text-muted-foreground">评论功能暂未启用。</p>
      )}
      {giscus.enabled && loadState === 'loading' && (
        <div className="flex min-h-[300px] items-center justify-center" role="status">
          <p className="text-sm text-muted-foreground">正在加载评论…</p>
        </div>
      )}
      {giscus.enabled && loadState === 'error' && (
        <div
          className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center"
          role="alert"
        >
          <p className="text-sm text-muted-foreground">
            评论加载失败或响应超时，请检查网络后重试。
          </p>
          <button
            type="button"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            onClick={retry}
          >
            重新加载评论
          </button>
        </div>
      )}
      {shouldLoad && giscus.enabled && loadState !== 'error' && (
        <Giscus
          key={retryCount}
          id={giscus.id}
          repo={giscus.repo as `${string}/${string}`}
          repoId={giscus.repoId}
          category={giscus.category}
          categoryId={giscus.categoryId}
          mapping={giscus.mapping as 'pathname'}
          reactionsEnabled={giscus.reactionsEnabled as '0' | '1'}
          // Metadata confirms that the discussion loaded, including cached iframe documents.
          emitMetadata="1"
          inputPosition={giscus.inputPosition as 'top' | 'bottom'}
          theme={theme}
          lang={giscus.lang as 'zh-CN'}
          loading={giscus.loading as 'eager'} // Load immediately once component is mounted
        />
      )}
    </div>
  );
}
