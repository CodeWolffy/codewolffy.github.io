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

    return (
        <nav className="space-y-2">
            <div
                className="flex items-center gap-1 cursor-pointer lg:cursor-default"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="font-medium text-sm">此页内容</h3>
                <ChevronRight
                    className={cn(
                        "h-4 w-4 transition-transform lg:hidden text-muted-foreground",
                        isOpen && "rotate-90"
                    )}
                />
            </div>
            <ul className={cn(
                "space-y-2 text-sm pt-2 lg:pt-0 border-t lg:border-none mt-2 lg:mt-0",
                isOpen ? "block" : "hidden lg:block",
                // Add max-height and overflow for mobile sticky handling
                isOpen && "lg:hidden max-h-[60vh] overflow-y-auto"
            )}>
                {headings.map((heading) => (
                    <li key={heading.slug} style={{ paddingLeft: `${(heading.depth - 1) * 1}rem` }}>
                        <a
                            href={`#${heading.slug}`}
                            className={cn(
                                "block text-muted-foreground transition-all hover:text-foreground",
                                activeId === heading.slug && "font-medium text-primary"
                            )}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(heading.slug)?.scrollIntoView({
                                    behavior: 'smooth'
                                });
                                // Manually set active since intersection observer might lag during smooth scroll
                                setActiveId(heading.slug);
                                // Update URL hash without jumping
                                history.pushState(null, '', `#${heading.slug}`);
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
