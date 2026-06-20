import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// 声明 PagefindUI 类型
declare global {
  interface Window {
    PagefindUI?: new (options: {
      element: string | HTMLElement;
      showSubResults?: boolean;
      showImages?: boolean;
      autofocus?: boolean;
    }) => void;
  }
}

const PAGEFIND_CSS_ID = 'pagefind-ui-css';
const PAGEFIND_SCRIPT_ID = 'pagefind-ui-script';
let pagefindAssetPromise: Promise<void> | null = null;

function loadPagefindAssets() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Pagefind cannot load without window.'));
  }

  if (window.PagefindUI) {
    return Promise.resolve();
  }

  if (import.meta.env?.PROD === false) {
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
      existingScript.addEventListener('load', resolveIfReady, { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Pagefind UI failed to load.')),
        { once: true }
      );
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
    throw error;
  });

  return pagefindAssetPromise;
}

function applyPagefindSearchValue(container: HTMLElement, value: string) {
  const pagefindInput = container.querySelector('.pagefind-ui__search-input') as HTMLInputElement | null;
  if (!pagefindInput) return false;

  pagefindInput.value = value;
  ['input', 'change', 'keyup'].forEach((eventName) => {
    pagefindInput.dispatchEvent(new Event(eventName, { bubbles: true }));
  });
  return true;
}

function syncPagefindSearchValue(container: HTMLElement, value: string, retries = 8) {
  if (!value) return applyPagefindSearchValue(container, '');
  if (applyPagefindSearchValue(container, value)) return true;
  if (retries <= 0) return false;

  window.requestAnimationFrame(() => {
    syncPagefindSearchValue(container, value, retries - 1);
  });
  return false;
}

function hidePagefindSearchControls(container: HTMLElement) {
  const searchInput = container.querySelector('.pagefind-ui__search-input') as HTMLElement | null;
  if (!searchInput) return;

  const targets = [
    searchInput,
    searchInput.closest('.pagefind-ui__search'),
    searchInput.closest('.pagefind-ui__form'),
    searchInput.closest('form'),
    searchInput.closest('.pagefind-ui__search-wrapper'),
  ];

  targets.forEach((target) => {
    if (target instanceof HTMLElement) {
      target.style.setProperty('display', 'none', 'important');
      target.setAttribute('aria-hidden', 'true');
    }
  });
}

export function Search() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>(
    'idle'
  );
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pagefindContainerRef = useRef<HTMLDivElement>(null);
  const pagefindCleanupRef = useRef<(() => void) | null>(null);

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        setSearchValue('');
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isExpanded]);

  // Initialize Pagefind when expanded
  useEffect(() => {
    if (!isExpanded) return;

    // Small delay to ensure the container is rendered
    const timer = setTimeout(async () => {
      const pagefindContainer = pagefindContainerRef.current;
      if (!pagefindContainer) return;

      // 清理之前的实例，避免重复挂载
      pagefindCleanupRef.current?.();
      pagefindCleanupRef.current = null;

      try {
        setSearchStatus('loading');
        await loadPagefindAssets();

        if (!window.PagefindUI) {
          throw new Error('Pagefind UI is unavailable.');
        }

        // 清空容器后再初始化，保持 React 与真实 DOM 一致
        pagefindContainer.innerHTML = '';
        new window.PagefindUI({
          element: pagefindContainer,
          showSubResults: true,
          showImages: false,
          autofocus: false, // We handle focus ourselves
        });
        hidePagefindSearchControls(pagefindContainer);
        requestAnimationFrame(() => hidePagefindSearchControls(pagefindContainer));
        syncPagefindSearchValue(pagefindContainer, searchValue);
        setSearchStatus('ready');
        pagefindCleanupRef.current = () => {
          pagefindContainer.innerHTML = '';
        };
      } catch (error) {
        console.warn('Pagefind init failed:', error);
        setSearchStatus('unavailable');
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      pagefindCleanupRef.current?.();
      pagefindCleanupRef.current = null;
    };
    // searchValue 的同步由下面的 useEffect 负责，此处仅在展开时初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && pagefindContainerRef.current) {
      syncPagefindSearchValue(pagefindContainerRef.current, searchValue);
    }
  }, [searchValue, isExpanded]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setSearchValue('');
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleClear = () => {
    setSearchValue('');
    inputRef.current?.focus();
    const pagefindInput = pagefindContainerRef.current?.querySelector(
      '.pagefind-ui__search-input'
    ) as HTMLInputElement | undefined;
    if (pagefindInput) {
      pagefindInput.value = '';
      pagefindInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const handleSearchClick = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const hasSearchQuery = searchValue.trim().length > 0;

  return (
    <div
      ref={searchContainerRef}
      className={cn(
        'relative',
        isExpanded
          ? 'w-full'
          : 'w-9 md:w-full flex justify-end md:justify-start'
      )}
    >
      {/* Search Input Container */}
      <div
        className={cn(
          'flex items-center h-9 rounded-md border border-input bg-background text-sm shadow-sm transition-shadow duration-200',
          isExpanded
            ? 'w-full px-3 justify-start shadow-md md:shadow-none'
            : 'w-9 px-0 justify-center border-transparent md:border-input md:w-full md:px-3 md:justify-start cursor-pointer'
        )}
        onClick={!isExpanded ? handleSearchClick : undefined}
      >
        <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索文章..."
          aria-label="搜索文章"
          value={searchValue}
          onChange={handleInputChange}
          className={cn(
            'flex-1 bg-transparent ml-2 outline-none placeholder:text-muted-foreground',
            !isExpanded ? 'hidden md:block pointer-events-none' : 'block'
          )}
          readOnly={!isExpanded}
        />
        {isExpanded && searchValue && (
          <button onClick={handleClear} className="p-1 hover:bg-accent rounded">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
        {!isExpanded && (
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isExpanded && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-2 rounded-lg border border-border bg-background shadow-lg z-50 max-h-[70vh] overflow-hidden',
            hasSearchQuery && 'min-h-[12rem]'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="搜索结果"
        >
          {searchStatus === 'loading' && (
            <div className="p-2 py-8 text-center text-sm text-muted-foreground">
              正在加载搜索...
            </div>
          )}
          {searchStatus === 'unavailable' && (
            <div className="p-2 flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
              <p>搜索功能仅在生产构建模式下可用。</p>
              <p className="text-xs">因为 Pagefind 需要在构建时生成索引。</p>
              <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                npm run build && npm run preview
              </p>
            </div>
          )}
          {searchStatus === 'ready' && !hasSearchQuery && (
            <div className="flex min-h-[6rem] items-center justify-center p-4 text-sm text-muted-foreground">
              输入关键词后显示搜索结果
            </div>
          )}
          <div
            ref={pagefindContainerRef}
            id="pagefind-results"
            className={cn(
              'max-h-[70vh] overflow-y-auto p-2',
              searchStatus === 'ready' && hasSearchQuery ? 'block' : 'hidden'
            )}
          />
        </div>
      )}
    </div>
  );
}
