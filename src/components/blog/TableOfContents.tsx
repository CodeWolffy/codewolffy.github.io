import type { MarkdownHeading } from 'astro';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface TocProps {
    headings: MarkdownHeading[];
}

export function TableOfContents({ headings }: TocProps) {
    const [activeId, setActiveId] = React.useState<string>('');

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
            <h3 className="font-medium">本页目录</h3>
            <ul className="space-y-2 text-sm">
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
