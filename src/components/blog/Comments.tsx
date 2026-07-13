import { useState, useEffect, useRef } from 'react';
import Giscus from '@giscus/react';
import { useTheme } from '@/hooks/useTheme';

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

  // 处理 GitHub 登录后保持在评论区位置
  // 原理：当用户在评论区可见时离开页面（去 GitHub 登录），保存位置标记
  // 返回后检测标记并恢复位置
  useEffect(() => {
    let isCommentsVisible = false;
    const STORAGE_KEY = `giscus-scroll-position:${window.location.pathname}`;

    // 监听评论区是否在视口中
    const commentsDiv = document.getElementById('comments-container');

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
    const savedPosition = sessionStorage.getItem(STORAGE_KEY);
    const parsedPosition = savedPosition === null ? Number.NaN : Number(savedPosition);
    if (Number.isFinite(parsedPosition) && parsedPosition >= 0) {
      sessionStorage.removeItem(STORAGE_KEY);
      // 等待页面布局稳定后滚动
      // 等待页面布局稳定后滚动 - 增加延时以避免移动端渲染冲突导致卡死
      setTimeout(() => {
        requestAnimationFrame(() => {
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
        sessionStorage.setItem(STORAGE_KEY, String(window.scrollY));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // "Smart Eager" Loading:
  // Wait for the main thread to settle (useEffect runs after paint), then trigger "eager" loading.
  // This prevents the heavy iframe setup from blocking the initial page scroll/interaction.
  const [shouldLoad, setShouldLoad] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShouldLoad(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldLoad || !giscus.enabled) return;
    setLoadState('loading');

    const container = containerRef.current;
    if (!container) return;
    let iframe: HTMLIFrameElement | null = null;
    const handleLoad = () => setLoadState('ready');
    const handleError = () => setLoadState('error');
    const observeIframe = () => {
      iframe = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
      if (!iframe) return false;
      iframe.addEventListener('load', handleLoad, { once: true });
      iframe.addEventListener('error', handleError, { once: true });
      return true;
    };
    const observer = new MutationObserver(() => {
      if (observeIframe()) observer.disconnect();
    });
    if (!observeIframe()) observer.observe(container, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => setLoadState('error'), 15000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      iframe?.removeEventListener('load', handleLoad);
      iframe?.removeEventListener('error', handleError);
    };
  }, [shouldLoad, giscus.enabled, retryCount]);

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
            onClick={() => setRetryCount((count) => count + 1)}
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
          emitMetadata={giscus.emitMetadata as '0' | '1'}
          inputPosition={giscus.inputPosition as 'top' | 'bottom'}
          theme={theme}
          lang={giscus.lang as 'zh-CN'}
          loading={giscus.loading as 'eager'} // Load immediately once component is mounted
        />
      )}
    </div>
  );
}
