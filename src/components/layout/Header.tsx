import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  Moon,
  Sun,
  Menu,
  X,
  Home,
  Archive,
  BookOpen,
  Tags,
  FolderGit2,
  Users,
  User,
} from 'lucide-react';
import { Search } from '@/components/blog/Search';

const getNavIcon = (href: string) => {
  const cleanHref = href.replace(/\/$/, '') || '/';
  switch (cleanHref) {
    case '/':
      return <Home className="h-4 w-4 shrink-0" />;
    case '/archives':
      return <Archive className="h-4 w-4 shrink-0" />;
    case '/series':
      return <BookOpen className="h-4 w-4 shrink-0" />;
    case '/categories':
    case '/tags':
      return <Tags className="h-4 w-4 shrink-0" />;
    case '/projects':
      return <FolderGit2 className="h-4 w-4 shrink-0" />;
    case '/friends':
      return <Users className="h-4 w-4 shrink-0" />;
    case '/about':
      return <User className="h-4 w-4 shrink-0" />;
    default:
      return null;
  }
};

interface HeaderProps {
  name: string;
  navigation: Array<{ label: string; href: string }>;
  githubUrl: string;
}

export function Header({ name, navigation, githubUrl }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pathname, setPathname] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePageLoad = () => {
      setIsMenuOpen(false);
      setPathname(window.location.pathname);
    };
    handlePageLoad();
    document.addEventListener('astro:page-load', handlePageLoad);
    return () => document.removeEventListener('astro:page-load', handlePageLoad);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    // 彻底锁定移动端和桌面端的滚动（必须同时锁定 html 与 body，并拦截 touchmove）
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleTouchMove = (event: TouchEvent) => {
      if (mobileNavRef.current && mobileNavRef.current.contains(event.target as Node)) {
        const el = mobileNavRef.current;
        if (el.scrollHeight <= el.clientHeight) {
          event.preventDefault();
        }
        return;
      }
      event.preventDefault();
    };

    const firstLink = mobileNavRef.current?.querySelector<HTMLAnchorElement>('a');
    requestAnimationFrame(() => firstLink?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsMenuOpen(false);
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMenuOpen]);

  const isCurrentPage = (href: string) => {
    const normalizedHref = href === '/' ? '/' : href.replace(/\/$/, '');
    const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
    return normalizedHref === '/'
      ? normalizedPath === '/'
      : normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="relative z-50 w-full bg-background">
        <div className="site-header-shell">
          <div className="flex h-11 w-full items-center justify-between md:h-12 md:justify-start">
            {/* Left Side: Desktop Nav + Mobile Menu + Mobile Logo */}
            <div className="flex items-center gap-1 md:mr-4">
              {/* Desktop: Logo + Nav */}
              <div className="hidden lg:flex shrink-0">
                <a className="mr-5 flex items-center space-x-2 font-bold text-2xl" href="/">
                  <span className="hidden font-bold sm:inline-block">{name}</span>
                </a>
                <nav className="flex items-center space-x-4 xl:space-x-5 text-base font-medium">
                  {navigation.map((item) => (
                    <a
                      key={item.href}
                      className="transition-colors hover:text-foreground/80 text-foreground/60"
                      href={item.href}
                      aria-current={isCurrentPage(item.href) ? 'page' : undefined}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Mobile: Menu Button */}
              <div className="lg:hidden shrink-0">
                <Button
                  ref={menuButtonRef}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:h-10 md:w-10"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-nav"
                  aria-label={isMenuOpen ? '关闭菜单' : '打开菜单'}
                >
                  {isMenuOpen ? (
                    <X className="h-[26px] w-[26px]" />
                  ) : (
                    <Menu className="h-[26px] w-[26px]" />
                  )}
                </Button>
              </div>

              {/* Mobile: Logo */}
              <div className="lg:hidden font-bold text-lg shrink-0">
                <a href="/">{name}</a>
              </div>
            </div>

            {/* Right Side: Search + Github + Theme */}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1 md:justify-end">
              {/* Search */}
              <div className="flex min-w-0 flex-1 justify-end md:mx-4">
                <ErrorBoundary
                  fallback={<div className="h-9 w-[8.5rem] max-[374px]:w-9 md:w-full" />}
                >
                  <Search />
                </ErrorBoundary>
              </div>

              {/* Right Actions - 固定宽度 */}
              <div className="flex items-center shrink-0 space-x-1">
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 md:h-10 md:w-10 py-2 px-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span className="sr-only">GitHub</span>
                  </div>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:h-10 md:w-10"
                  onClick={toggleTheme}
                >
                  <Sun className="h-[26px] w-[26px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[26px] w-[26px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav Overlay + Floating Popover Card */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] touch-none lg:hidden animate-in fade-in-0 duration-200"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Floating Popover Card */}
          <div
            ref={mobileNavRef}
            id="mobile-nav"
            className="absolute top-[calc(100%+0.5rem)] left-3 sm:left-4 z-50 w-[9.25rem] sm:w-[9.75rem] rounded-2xl border border-border/70 bg-card/95 p-1 shadow-2xl shadow-black/15 backdrop-blur-md lg:hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
          >
            <nav className="flex flex-col space-y-0.5" aria-label="移动端导航">
              {navigation.map((item) => {
                const active = isCurrentPage(item.href);
                const icon = getNavIcon(item.href);
                return (
                  <a
                    key={item.href}
                    className={`flex items-center gap-2 py-2 px-2.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'text-foreground/80 hover:bg-accent/60 hover:text-foreground active:bg-accent/80'
                    }`}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {icon && (
                      <span className={active ? 'text-accent-foreground' : 'text-foreground/60'}>
                        {icon}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
