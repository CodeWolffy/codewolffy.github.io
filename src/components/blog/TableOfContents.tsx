import type { MarkdownHeading } from 'astro';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface TocProps {
  headings: MarkdownHeading[];
  id: string;
}

export function TableOfContents({ headings, id }: TocProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
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

    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    const syncWithLocation = () => {
      let hashId: string;
      try {
        hashId = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (!hashId || !headings.some((heading) => heading.slug === hashId)) return;

      setActiveId(hashId);
    };

    syncWithLocation();
    window.addEventListener('popstate', syncWithLocation);
    window.addEventListener('hashchange', syncWithLocation);

    return () => {
      window.removeEventListener('popstate', syncWithLocation);
      window.removeEventListener('hashchange', syncWithLocation);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  const minDepth = headings.length > 0 ? Math.min(...headings.map((h) => h.depth)) : 0;

  return (
    <nav className="relative">
      <span className="hidden font-medium text-sm leading-none lg:block">此页内容</span>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-1 min-h-11 text-left lg:hidden"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={id}
      >
        <span className="font-medium text-sm leading-none">此页内容</span>
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform lg:hidden text-muted-foreground shrink-0',
            isOpen && 'rotate-90'
          )}
        />
      </button>
      <ul
        id={id}
        className={cn(
          'space-y-2 text-sm',
          // Mobile: Absolute Overlay
          isOpen ? 'block' : 'hidden',
          isOpen &&
            'lg:hidden absolute left-[-1rem] right-[-1rem] top-full mt-2 bg-secondary border-t border-b border-border/50 shadow-xl max-h-[min(60dvh,calc(100dvh-7rem))] overflow-y-auto overscroll-contain z-10 px-4 py-3',
          // Desktop: Static Flow
          'lg:block lg:static lg:border-none lg:mt-2 lg:bg-transparent lg:shadow-none lg:max-h-none lg:overflow-visible lg:p-0'
        )}
      >
        {headings.map((heading) => (
          <li key={heading.slug} style={{ paddingLeft: `${(heading.depth - minDepth) * 1}rem` }}>
            <a
              href={`#${heading.slug}`}
              className={cn(
                'block text-muted-foreground transition-all hover:text-foreground line-clamp-2',
                activeId === heading.slug &&
                  'font-bold text-primary border-l-2 border-primary pl-2 -ml-2'
              )}
              onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                setActiveId(heading.slug);
                // Let Astro handle the anchor and preserve its navigation history state.
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
