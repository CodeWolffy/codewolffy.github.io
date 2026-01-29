import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Github, Moon, Sun, Menu, X } from "lucide-react";
import { Search } from "@/components/blog/Search";
import { cn } from "@/lib/utils";

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

    React.useEffect(() => {
        // Sync state with document class initialized by BaseLayout
        const syncTheme = () => {
            setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        };

        // Initial sync
        syncTheme();

        // Listen for View Transitions navigation
        document.addEventListener('astro:after-swap', syncTheme);

        // Listen for class changes on documentElement (for external theme changes)
        const observer = new MutationObserver(syncTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => {
            document.removeEventListener('astro:after-swap', syncTheme);
            observer.disconnect();
        };
    }, []);

    const toggleTheme = () => {
        if (theme === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setTheme('dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setTheme('light');
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background">
            <div className="flex w-full h-12 items-center justify-between md:justify-start px-1 md:px-8 max-w-[1600px] mx-auto">
                {/* Left Side: Desktop Nav + Mobile Menu + Mobile Logo */}
                <div className="flex items-center gap-1 md:mr-4">
                    {/* Desktop: Logo + Nav */}
                    <div className="hidden md:flex shrink-0">
                        <a className="mr-6 flex items-center space-x-2 font-bold text-2xl" href="/">
                            <span className="hidden font-bold sm:inline-block">狼码纪</span>
                        </a>
                        <nav className="flex items-center space-x-6 text-[17px] font-medium">
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/">首页</a>
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/archives">归档</a>
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/categories">分类/标签</a>
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/projects">项目</a>
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/friends">友链</a>
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/about">关于</a>
                        </nav>
                    </div>

                    {/* Mobile: Menu Button */}
                    <div className="md:hidden shrink-0">
                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? <X className="h-[26px] w-[26px]" /> : <Menu className="h-[26px] w-[26px]" />}
                        </Button>
                    </div>

                    {/* Mobile: Logo */}
                    <div className="md:hidden font-bold text-lg shrink-0">
                        <a href="/">狼码纪</a>
                    </div>
                </div>

                {/* Right Side: Search + Github + Theme */}
                <div className="flex items-center gap-1 md:flex-1 md:justify-end lg:justify-start">
                    {/* Search - Mobile: Collapsed/Right, Desktop: Fill/Left */}
                    <div className="md:flex-1 shrink-0 md:min-w-0 md:mx-4 flex justify-end md:justify-start">
                        <Search />
                    </div>

                    {/* Right Actions - 固定宽度 */}
                    <div className="flex items-center shrink-0 space-x-1">
                        <a href="https://github.com/CodeWolffy" target="_blank" rel="noreferrer" className="inline-flex">
                            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 py-2 w-10 px-0">
                                <Github className="h-[26px] w-[26px]" />
                                <span className="sr-only">GitHub</span>
                            </div>
                        </a>
                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleTheme}>
                            <Sun className="h-[26px] w-[26px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-[26px] w-[26px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                    </div>
                </div>
            </div>
            {/* Mobile Nav */}
            {isMenuOpen && (
                <div className="md:hidden border-t p-4 space-y-2 bg-background">
                    <nav className="flex flex-col space-y-1">
                        <a className="block py-3 px-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md active:bg-accent/80" href="/">首页</a>
                        <a className="block py-3 px-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md active:bg-accent/80" href="/archives">归档</a>
                        <a className="block py-3 px-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md active:bg-accent/80" href="/categories">分类/标签</a>
                        <a className="block py-3 px-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md active:bg-accent/80" href="/projects">项目</a>
                        <a className="block py-3 px-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md active:bg-accent/80" href="/friends">友链</a>
                        <a className="block py-3 px-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md active:bg-accent/80" href="/about">关于</a>
                    </nav>
                </div>
            )}
        </header>
    );
}
