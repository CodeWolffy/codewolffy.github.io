import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    PagefindUI?: new (options: {
      element: string | HTMLElement;
      showSubResults?: boolean;
      showImages?: boolean;
      autofocus?: boolean;
    }) => {
      triggerSearch: (term: string) => void;
      destroy: () => void;
    };
  }
}

const PAGEFIND_CSS_ID = 'pagefind-ui-css';
const PAGEFIND_SCRIPT_ID = 'pagefind-ui-script';
const SEARCH_FOCUS_DELAY_MS = 100;
const PAGEFIND_INIT_DELAY_MS = 50;
let pagefindAssetPromise: Promise<void> | null = null;

function loadPagefindAssets() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Pagefind cannot load without window.'));
  }

  if (window.PagefindUI) {
    return Promise.resolve();
  }

  if (import.meta.env.PROD === false) {
    return Promise.reject(new Error('Pagefind is only available after production build.'));
  }

  if (pagefindAssetPromise) {
    return pagefindAssetPromise;
  }

  pagefindAssetPromise = new Promise<void>((resolve, reject) => {
    if (!document.getElementById(PAGEFIND_CSS_ID)) {
      const link = document.createElement('link');
      link.id = PAGEFIND_CSS_ID;
      link.rel = 'stylesheet';
      link.href = '/pagefind/pagefind-ui.css';
      document.head.appendChild(link);
    }

    const resolveIfReady = () => {
      if (window.PagefindUI) {
        resolve();
      } else {
        reject(new Error('Pagefind UI failed to initialize.'));
      }
    };

    const existingScript = document.getElementById(PAGEFIND_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.PagefindUI) {
        resolve();
      } else {
        existingScript.addEventListener('load', resolveIfReady, { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Pagefind UI failed to load.')),
          { once: true }
        );
      }
      return;
    }

    const script = document.createElement('script');
    script.id = PAGEFIND_SCRIPT_ID;
    script.src = '/pagefind/pagefind-ui.js';
    script.async = true;
    script.addEventListener('load', resolveIfReady, { once: true });
    script.addEventListener('error', () => reject(new Error('Pagefind UI failed to load.')), {
      once: true,
    });
    document.head.appendChild(script);
  }).catch((error) => {
    pagefindAssetPromise = null;
    document.getElementById(PAGEFIND_SCRIPT_ID)?.remove();
    throw error;
  });

  return pagefindAssetPromise;
}

function hidePagefindSearchControls(container: HTMLElement) {
  const searchInput = container.querySelector('.pagefind-ui__search-input') as HTMLElement | null;
  if (!searchInput) return false;

  // In Pagefind UI v1.x the results drawer is a sibling of the input/clear button
  // inside the <form> element. Hiding the form itself would also hide the drawer,
  // so we only hide the individual controls we want to suppress.
  const searchClear = container.querySelector('.pagefind-ui__search-clear') as HTMLElement | null;
  const targets = [searchInput, searchClear];

  targets.forEach((target) => {
    if (target instanceof HTMLElement) {
      target.style.setProperty('display', 'none', 'important');
      target.setAttribute('aria-hidden', 'true');
    }
  });

  return true;
}

type PagefindInstance = {
  triggerSearch: (term: string) => void;
  destroy: () => void;
};

function getInitialSearchQuery() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('q') || '';
}

function getShortcutLabel() {
  if (typeof navigator !== 'undefined' && /macintosh|mac os x/i.test(navigator.userAgent)) {
    return '⌘K';
  }
  return 'Ctrl K';
}

export function Search() {
  const [searchValue, setSearchValue] = useState(getInitialSearchQuery);
  const [isExpanded, setIsExpanded] = useState(() => Boolean(getInitialSearchQuery()));
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>(
    'idle'
  );
  const [retryCount, setRetryCount] = useState(0);
  const [shortcutLabel] = useState(getShortcutLabel);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pagefindContainerRef = useRef<HTMLDivElement>(null);
  const pagefindInstanceRef = useRef<PagefindInstance | null>(null);

  // Handle Cmd+K / Ctrl+K keyboard shortcut and Escape
  const closeSearch = (restoreFocus = true) => {
    setIsExpanded(false);
    setSearchValue('');
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), SEARCH_FOCUS_DELAY_MS);
      }
      if (e.key === 'Escape' && isExpanded) {
        if (searchValue) {
          setSearchValue('');
          inputRef.current?.focus();
        } else {
          closeSearch();
        }
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isExpanded, searchValue]);

  // Lock body scroll on mobile when expanded
  useEffect(() => {
    if (isExpanded && typeof window !== 'undefined' && window.innerWidth < 768) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isExpanded]);

  // 支持 ?q= 深链（结构化数据 SearchAction / 外部直达搜索时自动聚焦）
  useEffect(() => {
    if (getInitialSearchQuery()) {
      setTimeout(() => inputRef.current?.focus(), SEARCH_FOCUS_DELAY_MS);
    }
  }, []);

  // Initialize Pagefind when expanded
  useEffect(() => {
    if (!isExpanded) return;

    const pagefindContainer = pagefindContainerRef.current;
    if (!pagefindContainer) return;

    const timer = setTimeout(async () => {
      // Cleanup previous instance
      if (pagefindInstanceRef.current) {
        pagefindInstanceRef.current.destroy();
        pagefindInstanceRef.current = null;
        pagefindContainer.innerHTML = '';
      }

      try {
        setSearchStatus('loading');
        await loadPagefindAssets();

        if (!window.PagefindUI) {
          throw new Error('Pagefind UI is unavailable.');
        }

        pagefindContainer.innerHTML = '';
        const instance = new window.PagefindUI({
          element: pagefindContainer,
          showSubResults: true,
          showImages: false,
          autofocus: false,
        });
        pagefindInstanceRef.current = instance;

        // Hide pagefind's own search controls (we use our own input)
        hidePagefindSearchControls(pagefindContainer);
        requestAnimationFrame(() => hidePagefindSearchControls(pagefindContainer));

        setSearchStatus('ready');
      } catch (error) {
        console.warn('Pagefind init failed:', error);
        setSearchStatus('unavailable');
      }
    }, PAGEFIND_INIT_DELAY_MS);

    return () => {
      clearTimeout(timer);
      if (pagefindInstanceRef.current) {
        pagefindInstanceRef.current.destroy();
        pagefindInstanceRef.current = null;
      }
      pagefindContainer.innerHTML = '';
      setSearchStatus('idle');
    };
  }, [isExpanded, retryCount]);

  // Debounced search query trigger: 150ms debounce eliminates burst queries
  // while typing fast, while 0ms debounce when clearing keeps resets instantaneous.
  useEffect(() => {
    if (!isExpanded || searchStatus !== 'ready') return;
    const instance = pagefindInstanceRef.current;
    if (!instance) return;

    const query = searchValue.trim();
    if (!query) {
      instance.triggerSearch('');
      return;
    }

    const timer = setTimeout(() => {
      instance.triggerSearch(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchValue, isExpanded, searchStatus]);

  // Click outside to close (desktop)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        closeSearch(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Click any result link inside pagefind to close the search panel
  useEffect(() => {
    const container = pagefindContainerRef.current;
    if (!container) return;

    const handleResultClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a');
      if (link) {
        closeSearch(false);
      }
    };

    container.addEventListener('click', handleResultClick);
    return () => container.removeEventListener('click', handleResultClick);
  }, []);

  // Keyboard navigation within pagefind results (ArrowDown/ArrowUp)
  useEffect(() => {
    const container = pagefindContainerRef.current;
    if (!container) return;

    const handleResultsKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (!activeEl || !container.contains(activeEl)) return;

      const links = Array.from(
        container.querySelectorAll<HTMLAnchorElement>('.pagefind-ui__result-link, a[href]')
      );
      if (links.length === 0) return;

      const currentIndex = links.indexOf(activeEl as HTMLAnchorElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < links.length - 1) {
          links[currentIndex + 1]?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          links[currentIndex - 1]?.focus();
        } else {
          inputRef.current?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleResultsKeyDown);
    return () => container.removeEventListener('keydown', handleResultsKeyDown);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const firstLink = pagefindContainerRef.current?.querySelector<HTMLAnchorElement>(
        '.pagefind-ui__result-link, a[href]'
      );
      firstLink?.focus();
    }
  };

  const handleClear = () => {
    setSearchValue('');
    inputRef.current?.focus();
  };

  const handleSearchClick = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSearchClose = () => closeSearch();

  const hasSearchQuery = searchValue.trim().length > 0;

  return (
    <>
      {/* Mobile Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[55] bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => closeSearch(false)}
          aria-hidden="true"
        />
      )}

      <div
        ref={searchContainerRef}
        className={cn(
          'relative flex max-w-full justify-end transition-[width] duration-200 ease-out',
          isExpanded
            ? 'fixed left-2 right-2 top-1 z-[60] w-auto md:relative md:left-auto md:right-auto md:top-auto md:z-auto md:w-full'
            : 'w-[7.5rem] sm:w-[8.5rem] max-[374px]:w-9 md:w-[14rem]'
        )}
      >
        {/* Search Input Box */}
        <div
          className={cn(
            'flex h-9 w-full items-center rounded-md border border-input bg-background text-sm shadow-sm transition-all duration-200 ease-out',
            isExpanded
              ? 'h-10 rounded-xl px-3 justify-start shadow-lg md:h-9 md:rounded-md md:shadow-none'
              : 'px-3 justify-start cursor-pointer hover:bg-accent hover:text-accent-foreground max-[374px]:justify-center max-[374px]:px-0'
          )}
        >
          <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          {isExpanded ? (
            <>
              <input
                ref={inputRef}
                type="search"
                role="combobox"
                placeholder="搜索文章..."
                aria-label="搜索文章"
                aria-expanded="true"
                aria-controls="pagefind-results-panel"
                aria-autocomplete="list"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                enterKeyHint="search"
                value={searchValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                className="ml-2 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden [&::-ms-clear]:hidden"
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label="清空搜索"
                  title="清空搜索"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <kbd className="hidden md:inline-flex ml-1.5 items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80 bg-muted border border-border rounded pointer-events-none select-none">
                ESC
              </kbd>
              <button
                type="button"
                onClick={handleSearchClose}
                className="ml-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors md:hidden shrink-0"
                aria-label="取消搜索"
              >
                取消
              </button>
            </>
          ) : (
            <button
              ref={triggerRef}
              type="button"
              onClick={handleSearchClick}
              className="absolute inset-0 flex items-center justify-between rounded-md pl-9 pr-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-[374px]:pl-0"
              aria-label="展开搜索"
              aria-haspopup="dialog"
              aria-expanded="false"
            >
              <span className="max-[374px]:sr-only text-muted-foreground">搜索文章...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                {shortcutLabel}
              </kbd>
            </button>
          )}
        </div>

        {/* Results Dropdown */}
        {isExpanded && (
          <div
            className={cn(
              'fixed left-2 right-2 top-12 z-[60] mt-1 rounded-xl border border-border bg-background shadow-xl max-h-[calc(100vh-4rem)] overflow-hidden md:absolute md:top-full md:left-0 md:right-0 md:mt-2 md:rounded-lg md:shadow-lg md:max-h-[70vh]',
              hasSearchQuery && 'min-h-[12rem]'
            )}
            role="dialog"
            aria-modal="false"
            aria-label="搜索结果"
            id="pagefind-results-panel"
          >
            {searchStatus === 'loading' && (
              <div className="p-2 py-8 text-center text-sm text-muted-foreground">
                正在加载搜索...
              </div>
            )}
            {searchStatus === 'unavailable' && (
              <div className="p-2 flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
                {import.meta.env.DEV ? (
                  <>
                    <p>开发模式下未生成搜索索引。</p>
                    <p className="text-xs">使用生产构建预览即可测试全文搜索。</p>
                  </>
                ) : (
                  <>
                    <p role="alert">搜索服务加载失败，请检查网络后重试。</p>
                    <button
                      type="button"
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                      onClick={() => setRetryCount((count) => count + 1)}
                    >
                      重新加载搜索
                    </button>
                  </>
                )}
              </div>
            )}
            {searchStatus === 'ready' && !hasSearchQuery && (
              <div className="flex min-h-[6rem] items-center justify-center p-4 text-sm text-muted-foreground">
                输入关键词后显示搜索结果
              </div>
            )}
            {/* Pagefind mounts here; always kept in DOM so it can initialize */}
            <div
              ref={pagefindContainerRef}
              id="pagefind-results"
              className={cn(
                'max-h-[calc(100vh-5rem)] overflow-y-auto p-2 md:max-h-[70vh]',
                searchStatus === 'ready' && hasSearchQuery ? 'block' : 'hidden'
              )}
            />
          </div>
        )}
      </div>
    </>
  );
}
