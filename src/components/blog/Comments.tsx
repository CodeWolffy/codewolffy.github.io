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

const SLOW_LOADING_HINT_MS = 5000;

interface CommentsProps {
  giscus: GiscusConfig;
}

export function Comments({ giscus }: CommentsProps) {
  const theme = useTheme();
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isSlowLoading, setIsSlowLoading] = useState(false);
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
  // Wait for the main thread to settle (next animation frame after hydration), then trigger loading.
  // This prevents the heavy iframe setup from blocking the initial page scroll/interaction.
  const [shouldLoad, setShouldLoad] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setShouldLoad(true);
      setLoadState('loading');
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!giscus.enabled || loadState !== 'loading') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset slow-hint state when leaving loading.
      setIsSlowLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsSlowLoading(true);
    }, SLOW_LOADING_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [giscus.enabled, loadState, retryCount]);

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
    setIsSlowLoading(false);
    setLoadState('loading');
    setRetryCount((count) => count + 1);
  };

  return (
    <div
      id="comments-container"
      ref={containerRef}
      className="relative mt-2 min-h-[300px] w-full scroll-mt-20"
      style={{ contain: 'content' }} // CSS Isolation: isolates layout calculations
    >
      {!giscus.enabled && (
        <p className="py-8 text-center text-sm text-muted-foreground">评论功能暂未启用。</p>
      )}
      {giscus.enabled && (loadState === 'idle' || loadState === 'loading') && (
        <div
          className="flex min-h-[300px] flex-col justify-between rounded-xl border border-border/60 bg-card/50 p-4 sm:p-5"
          role="status"
          aria-live="polite"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-28 animate-pulse rounded-md bg-muted" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-14 animate-pulse rounded-full bg-muted" />
                <div className="h-7 w-14 animate-pulse rounded-full bg-muted" />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3.5">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
                <div className="h-6 w-14 animate-pulse rounded bg-muted" />
                <div className="h-6 w-14 animate-pulse rounded bg-muted/70" />
              </div>
              <div className="space-y-2 py-2">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted/80" />
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="h-3.5 w-32 animate-pulse rounded bg-muted/60" />
                <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary/60"
              aria-hidden="true"
            />
            <span>
              {isSlowLoading
                ? '正在连接 GitHub Discussions，弱网或首次加载可能需要十余秒…'
                : '正在加载评论区…'}
            </span>
          </div>
        </div>
      )}
      {giscus.enabled && loadState === 'error' && (
        <div
          className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card/50 p-6 text-center"
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
        <div
          className={
            loadState === 'ready'
              ? 'relative opacity-100 transition-opacity duration-150'
              : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'
          }
          aria-hidden={loadState !== 'ready' || undefined}
        >
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
        </div>
      )}
    </div>
  );
}
