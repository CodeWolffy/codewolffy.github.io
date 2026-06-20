import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { Search } from '@/components/blog/Search';

interface HeaderProps {
  name: string;
  navigation: Array<{ label: string; href: string }>;
  githubUrl: string;
}

export function Header({ name, navigation, githubUrl }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const closeMenu = () => setIsMenuOpen(false);
    document.addEventListener('astro:page-load', closeMenu);
    return () => document.removeEventListener('astro:page-load', closeMenu);
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex w-full h-11 md:h-12 items-center justify-between md:justify-start px-1 md:px-8 max-w-[1400px] mx-auto">
        {/* Left Side: Desktop Nav + Mobile Menu + Mobile Logo */}
        <div className="flex items-center gap-1 md:mr-4">
          {/* Desktop: Logo + Nav */}
          <div className="hidden md:flex shrink-0">
            <a className="mr-6 flex items-center space-x-2 font-bold text-2xl" href="/">
              <span className="hidden font-bold sm:inline-block">{name}</span>
            </a>
            <nav className="flex items-center space-x-6 text-[17px] font-medium">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                  href={item.href}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Mobile: Menu Button */}
          <div className="md:hidden shrink-0">
            <Button
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
          <div className="md:hidden font-bold text-lg shrink-0">
            <a href="/">{name}</a>
          </div>
        </div>

        {/* Right Side: Search + Github + Theme */}
        <div className="flex items-center gap-1 md:flex-1 md:justify-end lg:justify-start">
          {/* Search - Mobile: Collapsed/Right, Desktop: Fill/Left */}
          <div className="md:flex-1 shrink-0 md:min-w-0 md:mx-4 flex justify-end md:justify-start">
            <ErrorBoundary fallback={<div className="w-9 h-9 md:w-full md:h-9" />}>
              <Search />
            </ErrorBoundary>
          </div>

          {/* Right Actions - 固定宽度 */}
          <div className="flex items-center shrink-0 space-x-1">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
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
      {/* Mobile Nav */}
      {isMenuOpen && (
        <div id="mobile-nav" className="md:hidden border-t p-4 space-y-2 bg-background">
          <nav className="flex flex-col space-y-1" aria-label="移动端导航">
            {navigation.map((item) => (
              <a
                key={item.href}
                className="block py-3 px-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md active:bg-accent/80"
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
