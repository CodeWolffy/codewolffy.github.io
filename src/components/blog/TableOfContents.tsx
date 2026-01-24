import type { MarkdownHeading } from 'astro';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface TocProps {
    headings: MarkdownHeading[];
}

export function TableOfContents({ headings }: TocProps) {
    const [activeId, setActiveId] = React.useState<string>('');
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '0% 0% -80% 0%' }
        );

        headings.forEach((heading) => {
            const element = document.getElementById(heading.slug);
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            headings.forEach((heading) => {
                const element = document.getElementById(heading.slug);
                if (element) {
                    observer.unobserve(element);
                }
            });
        };
    }, [headings]);

    if (headings.length === 0) return null;

    const minDepth = headings.length > 0 ? Math.min(...headings.map(h => h.depth)) : 0;

    return (
        <nav className="relative">
            <div
                className="flex items-center justify-between gap-1 cursor-pointer lg:cursor-default min-h-[36px]"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="font-medium text-sm leading-none">此页内容</h3>
                <ChevronRight
                    className={cn(
                        "h-4 w-4 transition-transform lg:hidden text-muted-foreground shrink-0",
                        isOpen && "rotate-90"
                    )}
                />
            </div>
            <ul className={cn(
                "space-y-2 text-sm",
                // Mobile: Absolute Overlay
                isOpen ? "block" : "hidden",
                isOpen && "lg:hidden absolute left-[-1rem] right-[-1rem] top-full mt-2 bg-secondary border-t border-b border-border/50 shadow-xl max-h-[60vh] overflow-y-auto z-50 px-4 py-3",
                // Desktop: Static Flow
                "lg:block lg:static lg:border-none lg:mt-2 lg:bg-transparent lg:shadow-none lg:max-h-none lg:overflow-visible lg:p-0"
            )}>
                {headings.map((heading) => (
                    <li key={heading.slug} style={{ paddingLeft: `${(heading.depth - minDepth) * 1}rem` }}>
                        <a
                            href={`#${heading.slug}`}
                            className={cn(
                                "block text-muted-foreground transition-all hover:text-foreground line-clamp-2",
                                activeId === heading.slug && "font-bold text-primary border-l-2 border-primary pl-2 -ml-2"
                            )}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(heading.slug)?.scrollIntoView({
                                    behavior: 'smooth'
                                });
                                // Manually set active since intersection observer might lag during smooth scroll
                                setActiveId(heading.slug);
                                // Update URL hash without jumping
                                // history.pushState(null, '', `#${heading.slug}`);
                                // Close menu on mobile after selection
                                setIsOpen(false);
                            }}
                        >
                            {heading.text}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
