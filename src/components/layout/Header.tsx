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
        setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
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
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center justify-between">
                {/* Logo */}
                <div className="mr-4 hidden md:flex">
                    <a className="mr-6 flex items-center space-x-2 font-bold" href="/">
                        <span className="hidden font-bold sm:inline-block">MyTechBlog</span>
                    </a>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/">首页</a>
                        <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/archives">归档</a>
                        <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/projects">项目</a>
                        <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/friends">友链</a>
                        <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/about">关于</a>
                    </nav>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Mobile Logo (Center) */}
                <div className="flex md:hidden font-bold">
                    MyTechBlog
                </div>

                {/* Right Actions */}
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        <Search />
                    </div>
                    <nav className="flex items-center">
                        <a href="https://github.com/CodeWolffy" target="_blank" rel="noreferrer">
                            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 py-2 w-9 px-0">
                                <Github className="h-4 w-4" />
                                <span className="sr-only">GitHub</span>
                            </div>
                        </a>
                        <Button variant="ghost" size="icon" onClick={toggleTheme}>
                            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                    </nav>
                </div>
            </div>
            {/* Mobile Nav */}
            {isMenuOpen && (
                <div className="md:hidden border-t p-4 space-y-4 bg-background">
                    <nav className="flex flex-col space-y-2">
                        <a className="text-sm font-medium transition-colors hover:text-foreground/80" href="/">首页</a>
                        <a className="text-sm font-medium transition-colors hover:text-foreground/80" href="/archives">归档</a>
                        <a className="text-sm font-medium transition-colors hover:text-foreground/80" href="/projects">项目</a>
                        <a className="text-sm font-medium transition-colors hover:text-foreground/80" href="/friends">友链</a>
                        <a className="text-sm font-medium transition-colors hover:text-foreground/80" href="/about">关于</a>
                    </nav>
                </div>
            )}
        </header>
    );
}
